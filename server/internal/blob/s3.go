// S3-compatible blob store. Backblaze B2 (and AWS S3, MinIO, R2, ...) all speak
// the same API, so one implementation covers them. The stored "path" is the
// object key — readers must NOT treat it as a local filesystem path.
package blob

import (
	"context"
	"errors"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

const defaultPresignTTL = 15 * time.Minute

// S3Config is the static credential set for an S3-compatible bucket. For
// Backblaze B2: Endpoint is the bucket's S3 endpoint
// (e.g. https://s3.us-west-004.backblazeb2.com), Region the matching region
// (us-west-004), KeyID/AppKey a B2 application key pair.
type S3Config struct {
	Endpoint     string
	Region       string
	Bucket       string
	KeyID        string
	AppKey       string
	UsePathStyle bool          // MinIO and some setups require path-style addressing.
	PresignTTL   time.Duration // 0 → defaultPresignTTL.
}

type S3 struct {
	client     *s3.Client
	tm         *transfermanager.Client
	presign    *s3.PresignClient
	bucket     string
	presignTTL time.Duration
}

func NewS3(cfg S3Config) (*S3, error) {
	if cfg.Bucket == "" || cfg.KeyID == "" || cfg.AppKey == "" {
		return nil, errors.New("blob: S3/B2 backend needs B2_BUCKET, B2_KEY_ID and B2_APP_KEY")
	}
	opts := s3.Options{
		Region:       cfg.Region,
		Credentials:  credentials.NewStaticCredentialsProvider(cfg.KeyID, cfg.AppKey, ""),
		UsePathStyle: cfg.UsePathStyle,
	}
	if cfg.Endpoint != "" {
		opts.BaseEndpoint = aws.String(cfg.Endpoint)
	}
	ttl := cfg.PresignTTL
	if ttl <= 0 {
		ttl = defaultPresignTTL
	}
	client := s3.New(opts)
	return &S3{
		client:     client,
		tm:         transfermanager.New(client),
		presign:    s3.NewPresignClient(client),
		bucket:     cfg.Bucket,
		presignTTL: ttl,
	}, nil
}

// countingReader tracks bytes streamed to the uploader so Put can report size
// without buffering the whole object in memory.
type countingReader struct {
	r io.Reader
	n int64
}

func (c *countingReader) Read(p []byte) (int, error) {
	n, err := c.r.Read(p)
	c.n += int64(n)
	return n, err
}

func (s *S3) Put(id string, r io.Reader) (string, int64, error) {
	cr := &countingReader{r: r}
	_, err := s.tm.UploadObject(context.Background(), &transfermanager.UploadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(id),
		Body:   cr,
	})
	if err != nil {
		return "", 0, err
	}
	return id, cr.n, nil
}

func (s *S3) Open(path string) (io.ReadCloser, error) {
	out, err := s.client.GetObject(context.Background(), &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

// PresignGet mints a time-limited GET URL so the gateway can redirect the
// browser straight to the bucket instead of streaming bytes through itself.
func (s *S3) PresignGet(ctx context.Context, path string) (string, error) {
	req, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	}, s3.WithPresignExpires(s.presignTTL))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

// HealthCheck verifies the bucket exists and the credentials can reach it.
func (s *S3) HealthCheck(ctx context.Context) error {
	_, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(s.bucket)})
	return err
}
