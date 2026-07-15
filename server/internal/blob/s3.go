// B2 uses its S3-compatible API. Stored paths are object keys, never local
// filesystem paths.
package blob

import (
	"context"
	"errors"
	"io"
	"net/url"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

const defaultPresignTTL = 15 * time.Minute

// B2Config contains the B2 S3 endpoint and application-key credentials.
type B2Config struct {
	Endpoint     string
	Region       string
	Bucket       string
	KeyID        string
	AppKey       string
	UsePathStyle bool          // B2 supports virtual-hosted and path-style endpoints.
	PresignTTL   time.Duration // 0 → defaultPresignTTL.
}

type B2 struct {
	client     *s3.Client
	tm         *transfermanager.Client
	presign    *s3.PresignClient
	bucket     string
	presignTTL time.Duration
}

func NewB2(cfg B2Config) (*B2, error) {
	if cfg.Bucket == "" || cfg.KeyID == "" || cfg.AppKey == "" {
		return nil, errors.New("blob: B2 needs B2_BUCKET, B2_KEY_ID and B2_APP_KEY")
	}
	endpoint, err := url.Parse(cfg.Endpoint)
	if err != nil || endpoint.Scheme != "https" || !strings.HasSuffix(endpoint.Hostname(), ".backblazeb2.com") {
		return nil, errors.New("blob: B2_ENDPOINT must be an https://*.backblazeb2.com S3 endpoint")
	}
	if cfg.Region == "" {
		return nil, errors.New("blob: B2 needs B2_REGION")
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
	return &B2{
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

func (s *B2) Put(id string, r io.Reader) (string, int64, error) {
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

// PresignGet mints a time-limited GET URL so the gateway can redirect the
// browser straight to the bucket instead of streaming bytes through itself.
func (s *B2) PresignGet(ctx context.Context, path string) (string, error) {
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
func (s *B2) HealthCheck(ctx context.Context) error {
	_, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(s.bucket)})
	return err
}
