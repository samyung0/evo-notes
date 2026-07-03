package store

import (
	"context"
	"encoding/json"
	"time"
)

type BillingInfo struct {
	PlanTier           PlanTier           `json:"planTier"`
	SubscriptionStatus SubscriptionStatus `json:"subscriptionStatus"`
	RenewalAt          *time.Time         `json:"renewalAt,omitempty"`
}

type IntegrationsStatus struct {
	Google    bool `json:"google"`
	Microsoft bool `json:"microsoft"`
}

type OAuthConnection struct {
	ID           string
	UserID       string
	Provider     string
	AccessToken  string
	RefreshToken string
	ExpiresAt    *time.Time
	Scopes       string
	AccountEmail string
}

/* --------------------------------------------------------------- users */

func (s *Store) Me(ctx context.Context, userID string) (User, error) {
	var u User
	row := s.pool.QueryRow(ctx, `SELECT id, name, email, COALESCE(avatar_url,''), COALESCE(class_label,''), streak,
		plan_tier, subscription_status FROM users WHERE id=$1`, userID)
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.AvatarURL, &u.ClassLabel, &u.Streak, &u.PlanTier, &u.SubscriptionStatus)
	if isNoRows(err) {
		return u, ErrNotFound
	}
	return u, err
}

func (s *Store) UpsertUserFromClerk(ctx context.Context, id, name, email, avatarURL string) error {
	if name == "" {
		name = email
	}
	if name == "" {
		name = "User"
	}
	_, err := s.pool.Exec(ctx, `INSERT INTO users (id, clerk_id, name, email, avatar_url)
		VALUES ($1,$1,$2,$3,NULLIF($4,''))
		ON CONFLICT (id) DO UPDATE SET
			name=EXCLUDED.name,
			email=EXCLUDED.email,
			avatar_url=COALESCE(NULLIF(EXCLUDED.avatar_url,''), users.avatar_url),
			updated_at=now()`,
		id, name, email, avatarURL)
	return err
}

func (s *Store) UpsertUserFromWebhook(ctx context.Context, id, name, email, avatarURL string) error {
	return s.UpsertUserFromClerk(ctx, id, name, email, avatarURL)
}

func (s *Store) MarkUserDeleted(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `UPDATE users SET email=email || '.deleted', updated_at=now() WHERE id=$1`, id)
	return err
}

func (s *Store) CreateDefaultWorkspace(ctx context.Context, userID string) error {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM workspaces WHERE user_id=$1`, userID).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	_, err := s.CreateWorkspace(ctx, userID, "My workspace", "green", "private", []string{})
	return err
}

func (s *Store) AssertWorkspaceOwner(ctx context.Context, userID, wsID string) error {
	var owner *string
	err := s.pool.QueryRow(ctx, `SELECT user_id FROM workspaces WHERE id=$1`, wsID).Scan(&owner)
	if isNoRows(err) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if owner == nil || *owner != userID {
		return ErrNotFound
	}
	return nil
}

/* --------------------------------------------------------- webhooks */

func (s *Store) WebhookProcessed(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT exists(SELECT 1 FROM webhook_events WHERE id=$1 AND processed_at IS NOT NULL)`, id).Scan(&exists)
	return exists, err
}

func (s *Store) RecordWebhookEvent(ctx context.Context, id, source, eventType string, payload json.RawMessage) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO webhook_events (id, source, event_type, payload)
		VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`, id, source, eventType, payload)
	return err
}

func (s *Store) MarkWebhookProcessed(ctx context.Context, id string, procErr error) error {
	var errStr *string
	if procErr != nil {
		s := procErr.Error()
		errStr = &s
	}
	_, err := s.pool.Exec(ctx, `UPDATE webhook_events SET processed_at=now(), error=$2 WHERE id=$1`, id, errStr)
	return err
}

/* --------------------------------------------------------- billing */

func (s *Store) GetBilling(ctx context.Context, userID string) (BillingInfo, error) {
	var b BillingInfo
	err := s.pool.QueryRow(ctx, `SELECT plan_tier, subscription_status FROM users WHERE id=$1`, userID).
		Scan(&b.PlanTier, &b.SubscriptionStatus)
	if isNoRows(err) {
		return b, ErrNotFound
	}
	return b, err
}

func (s *Store) GetStripeCustomerID(ctx context.Context, userID string) (string, error) {
	var id *string
	err := s.pool.QueryRow(ctx, `SELECT stripe_customer_id FROM users WHERE id=$1`, userID).Scan(&id)
	if isNoRows(err) {
		return "", ErrNotFound
	}
	if id == nil {
		return "", nil
	}
	return *id, err
}

func (s *Store) SetStripeCustomerID(ctx context.Context, userID, customerID string) error {
	_, err := s.pool.Exec(ctx, `UPDATE users SET stripe_customer_id=$2, updated_at=now() WHERE id=$1`, userID, customerID)
	return err
}

func (s *Store) UpdateSubscription(ctx context.Context, userID, status, planTier string) error {
	_, err := s.pool.Exec(ctx, `UPDATE users SET subscription_status=$2, plan_tier=$3, updated_at=now() WHERE id=$1`,
		userID, status, planTier)
	return err
}

func (s *Store) UpdateSubscriptionByCustomerID(ctx context.Context, customerID, status, planTier string) error {
	_, err := s.pool.Exec(ctx, `UPDATE users SET subscription_status=$2, plan_tier=$3, updated_at=now()
		WHERE stripe_customer_id=$1`, customerID, status, planTier)
	return err
}

func (s *Store) UserIDByStripeCustomer(ctx context.Context, customerID string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx, `SELECT id FROM users WHERE stripe_customer_id=$1`, customerID).Scan(&id)
	if isNoRows(err) {
		return "", ErrNotFound
	}
	return id, err
}

func (s *Store) ListStripeCustomers(ctx context.Context) ([]struct {
	UserID     string
	CustomerID string
	PlanTier   string
	Status     string
}, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, stripe_customer_id, plan_tier, subscription_status
		FROM users WHERE stripe_customer_id IS NOT NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []struct {
		UserID     string
		CustomerID string
		PlanTier   string
		Status     string
	}{}
	for rows.Next() {
		var row struct {
			UserID     string
			CustomerID string
			PlanTier   string
			Status     string
		}
		if err := rows.Scan(&row.UserID, &row.CustomerID, &row.PlanTier, &row.Status); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

/* ------------------------------------------------------- oauth */

func (s *Store) GetOAuthConnection(ctx context.Context, userID, provider string) (OAuthConnection, error) {
	var c OAuthConnection
	err := s.pool.QueryRow(ctx, `SELECT id, user_id, provider, access_token, COALESCE(refresh_token,''),
		expires_at, COALESCE(scopes,''), COALESCE(account_email,'')
		FROM oauth_connections WHERE user_id=$1 AND provider=$2`, userID, provider).
		Scan(&c.ID, &c.UserID, &c.Provider, &c.AccessToken, &c.RefreshToken, &c.ExpiresAt, &c.Scopes, &c.AccountEmail)
	if isNoRows(err) {
		return c, ErrNotFound
	}
	return c, err
}

func (s *Store) UpsertOAuthConnection(ctx context.Context, c OAuthConnection) error {
	if c.ID == "" {
		c.ID = uid("oauth")
	}
	_, err := s.pool.Exec(ctx, `INSERT INTO oauth_connections
		(id, user_id, provider, access_token, refresh_token, expires_at, scopes, account_email)
		VALUES ($1,$2,$3,$4,NULLIF($5,''),$6,NULLIF($7,''),NULLIF($8,''))
		ON CONFLICT (user_id, provider) DO UPDATE SET
			access_token=EXCLUDED.access_token,
			refresh_token=COALESCE(NULLIF(EXCLUDED.refresh_token,''), oauth_connections.refresh_token),
			expires_at=EXCLUDED.expires_at,
			scopes=EXCLUDED.scopes,
			account_email=EXCLUDED.account_email`,
		c.ID, c.UserID, c.Provider, c.AccessToken, c.RefreshToken, c.ExpiresAt, c.Scopes, c.AccountEmail)
	return err
}

func (s *Store) DeleteOAuthConnection(ctx context.Context, userID, provider string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM oauth_connections WHERE user_id=$1 AND provider=$2`, userID, provider)
	return err
}

func (s *Store) IntegrationsStatus(ctx context.Context, userID string) (IntegrationsStatus, error) {
	var st IntegrationsStatus
	rows, err := s.pool.Query(ctx, `SELECT provider FROM oauth_connections WHERE user_id=$1`, userID)
	if err != nil {
		return st, err
	}
	defer rows.Close()
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return st, err
		}
		switch p {
		case "google":
			st.Google = true
		case "microsoft":
			st.Microsoft = true
		}
	}
	return st, rows.Err()
}

func (s *Store) UpdateOAuthTokens(ctx context.Context, userID, provider, accessToken, refreshToken string, expiresAt *time.Time) error {
	_, err := s.pool.Exec(ctx, `UPDATE oauth_connections SET access_token=$3,
		refresh_token=COALESCE(NULLIF($4,''), refresh_token), expires_at=$5
		WHERE user_id=$1 AND provider=$2`, userID, provider, accessToken, refreshToken, expiresAt)
	return err
}
