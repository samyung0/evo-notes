package store

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

/* ------------------------------------------------------------------ patches */

type WorkspacePatch struct {
	Name    *string   `json:"name"`
	Color   *string   `json:"color"`
	Privacy *string   `json:"privacy"`
	Tags    *[]string `json:"tags"`
}
type ChapterPatch struct {
	Name  *string `json:"name"`
	Order *int    `json:"order"`
}
type QuizPatch struct {
	Name         *string          `json:"name"`
	Chapters     *[]string        `json:"chapters"`
	Questions    *json.RawMessage `json:"questions"`
	Privacy      *string          `json:"privacy"`
	TimeLimitMin *int             `json:"timeLimitMin"`
}
type CardPatch struct {
	Front *string `json:"front"`
	Back  *string `json:"back"`
	Known *bool   `json:"known"`
}
type TaskPatch struct {
	Title *string `json:"title"`
	Meta  *string `json:"meta"`
	Done  *bool   `json:"done"`
}
type EventPatch struct {
	Title    *string    `json:"title"`
	Start    *time.Time `json:"start"`
	End      *time.Time `json:"end"`
	LabelIDs *[]string  `json:"labelIds"`
	Location *string    `json:"location"`
	Note     *string    `json:"note"`
}

/* --------------------------------------------------------------- me / shell */

func (s *Store) Search(ctx context.Context, userID, q string) ([]SearchResult, error) {
	out := []SearchResult{}
	like := "%" + strings.ToLower(q) + "%"

	rows, err := s.pool.Query(ctx, `SELECT id, name, tags FROM workspaces
		WHERE user_id=$2 AND (lower(name) LIKE $1 OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE $1))`, like, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id, name string
		var tags []string
		if err := rows.Scan(&id, &name, &tags); err != nil {
			return nil, err
		}
		out = append(out, SearchResult{ID: id, Kind: "workspace", Title: name, Subtitle: strings.Join(tags, " · "), Href: "/workspaces/" + id})
	}
	rows.Close()

	rows, err = s.pool.Query(ctx, `SELECT f.id, f.name, f.workspace_id, w.name FROM files f
		JOIN workspaces w ON w.id=f.workspace_id WHERE w.user_id=$2 AND lower(f.name) LIKE $1`, like, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id, name, wsID, wsName string
		if err := rows.Scan(&id, &name, &wsID, &wsName); err != nil {
			return nil, err
		}
		out = append(out, SearchResult{ID: id, Kind: "file", Title: name, Subtitle: wsName, Href: "/workspaces/" + wsID + "?file=" + id})
	}
	rows.Close()

	rows, err = s.pool.Query(ctx, `SELECT id, title, COALESCE(location,'') FROM events WHERE user_id=$2 AND lower(title) LIKE $1`, like, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id, title, loc string
		if err := rows.Scan(&id, &title, &loc); err != nil {
			return nil, err
		}
		out = append(out, SearchResult{ID: id, Kind: "event", Title: title, Subtitle: loc, Href: "/schedule"})
	}
	rows.Close()

	rows, err = s.pool.Query(ctx, `SELECT d.id, d.name, d.workspace_name FROM decks d
		JOIN workspaces w ON w.id=d.workspace_id WHERE w.user_id=$2 AND lower(d.name) LIKE $1`, like, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id, name, wsName string
		if err := rows.Scan(&id, &name, &wsName); err != nil {
			return nil, err
		}
		out = append(out, SearchResult{ID: id, Kind: "flashcards", Title: name, Subtitle: wsName, Href: "/flashcards/" + id})
	}
	rows.Close()

	rows, err = s.pool.Query(ctx, `SELECT id, name FROM canvases WHERE user_id=$2 AND lower(name) LIKE $1`, like, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, err
		}
		out = append(out, SearchResult{ID: id, Kind: "thinking", Title: name, Href: "/thinking/" + id})
	}
	rows.Close()

	if len(out) > 20 {
		out = out[:20]
	}
	return out, nil
}

func (s *Store) Notifications(ctx context.Context, userID string) ([]Notification, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, kind, title, body, at, read FROM notifications WHERE user_id=$1 ORDER BY at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Notification{}
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.Kind, &n.Title, &n.Body, &n.At, &n.Read); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (s *Store) MarkNotificationsRead(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx, `UPDATE notifications SET read=true WHERE user_id=$1 AND read=false`, userID)
	return err
}

/* --------------------------------------------------------------- workspaces */

const wsCols = `w.id, w.name, w.color, w.privacy, w.tags,
	(SELECT count(*) FROM chapters c WHERE c.workspace_id=w.id),
	(SELECT count(*) FROM files f WHERE f.workspace_id=w.id),
	w.created_at, w.last_accessed_at`

func scanWorkspace(row pgx.Row) (Workspace, error) {
	var w Workspace
	err := row.Scan(&w.ID, &w.Name, &w.Color, &w.Privacy, &w.Tags, &w.ChapterCount, &w.FileCount, &w.CreatedAt, &w.LastAccessedAt)
	return w, err
}

func (s *Store) ListWorkspaces(ctx context.Context, userID, q, sortKey, color, tag string) ([]Workspace, error) {
	sb := "SELECT " + wsCols + " FROM workspaces w WHERE w.user_id=$1"
	args := []any{userID}
	if q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		n := len(args)
		sb += fmt.Sprintf(" AND (lower(w.name) LIKE $%d OR EXISTS (SELECT 1 FROM unnest(w.tags) t WHERE lower(t) LIKE $%d))", n, n)
	}
	if color != "" {
		args = append(args, color)
		sb += fmt.Sprintf(" AND w.color=$%d", len(args))
	}
	if tag != "" {
		args = append(args, tag)
		sb += fmt.Sprintf(" AND $%d = ANY(w.tags)", len(args))
	}
	switch sortKey {
	case "created":
		sb += " ORDER BY w.created_at DESC"
	case "chapters":
		sb += " ORDER BY (SELECT count(*) FROM chapters c WHERE c.workspace_id=w.id) DESC"
	case "files":
		sb += " ORDER BY (SELECT count(*) FROM files f WHERE f.workspace_id=w.id) DESC"
	default:
		sb += " ORDER BY w.last_accessed_at DESC"
	}
	rows, err := s.pool.Query(ctx, sb, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Workspace{}
	for rows.Next() {
		w, err := scanWorkspace(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

func (s *Store) GetWorkspace(ctx context.Context, userID, id string, touch bool) (Workspace, error) {
	if err := s.AssertWorkspaceOwner(ctx, userID, id); err != nil {
		return Workspace{}, err
	}
	if touch {
		_, _ = s.pool.Exec(ctx, `UPDATE workspaces SET last_accessed_at=now() WHERE id=$1`, id)
	}
	w, err := scanWorkspace(s.pool.QueryRow(ctx, "SELECT "+wsCols+" FROM workspaces w WHERE w.id=$1", id))
	if isNoRows(err) {
		return w, ErrNotFound
	}
	return w, err
}

func (s *Store) WorkspaceStats(ctx context.Context, userID, id string) (WorkspaceStats, error) {
	if err := s.AssertWorkspaceOwner(ctx, userID, id); err != nil {
		return WorkspaceStats{}, err
	}
	var st WorkspaceStats
	err := s.pool.QueryRow(ctx, `SELECT
		(SELECT count(*) FROM chapters WHERE workspace_id=$1),
		(SELECT count(*) FROM files WHERE workspace_id=$1),
		(SELECT count(*) FROM quizzes WHERE workspace_id=$1),
		(SELECT count(*) FROM attempts a JOIN quizzes q ON q.id=a.quiz_id WHERE q.workspace_id=$1),
		COALESCE((SELECT round(avg(a.pct))::int FROM attempts a JOIN quizzes q ON q.id=a.quiz_id WHERE q.workspace_id=$1),0)`,
		id).Scan(&st.Chapters, &st.Files, &st.Quizzes, &st.Attempts, &st.AvgScore)
	return st, err
}

func (s *Store) CreateWorkspace(ctx context.Context, userID, name, color, privacy string, tags []string) (Workspace, error) {
	id := uid("ws")
	_, err := s.pool.Exec(ctx, `INSERT INTO workspaces (id, user_id, name, color, privacy, tags) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, userID, name, color, privacy, tags)
	if err != nil {
		return Workspace{}, err
	}
	return s.GetWorkspace(ctx, userID, id, false)
}

func (s *Store) UpdateWorkspace(ctx context.Context, userID, id string, p WorkspacePatch) (Workspace, error) {
	if err := s.AssertWorkspaceOwner(ctx, userID, id); err != nil {
		return Workspace{}, err
	}
	ct, err := s.pool.Exec(ctx, `UPDATE workspaces SET
		name=COALESCE($2,name), color=COALESCE($3,color),
		privacy=COALESCE($4,privacy), tags=COALESCE($5,tags) WHERE id=$1`,
		id, p.Name, p.Color, p.Privacy, p.Tags)
	if err != nil {
		return Workspace{}, err
	}
	if ct.RowsAffected() == 0 {
		return Workspace{}, ErrNotFound
	}
	return s.GetWorkspace(ctx, userID, id, false)
}

func (s *Store) DeleteWorkspace(ctx context.Context, userID, id string) error {
	if err := s.AssertWorkspaceOwner(ctx, userID, id); err != nil {
		return err
	}
	_, err := s.pool.Exec(ctx, `DELETE FROM workspaces WHERE id=$1`, id)
	return err
}

/* ----------------------------------------------------------- chapters/files */

const chFiles = `COALESCE((SELECT array_agg(f.id ORDER BY f.added_at) FROM files f WHERE f.chapter_id=c.id), '{}')`

func (s *Store) ListChapters(ctx context.Context, wsID string) ([]Chapter, error) {
	rows, err := s.pool.Query(ctx, `SELECT c.id, c.workspace_id, c.name, c.position, `+chFiles+`
		FROM chapters c WHERE c.workspace_id=$1 ORDER BY c.position`, wsID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Chapter{}
	for rows.Next() {
		var c Chapter
		if err := rows.Scan(&c.ID, &c.WorkspaceID, &c.Name, &c.Order, &c.FileIDs); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) AddChapter(ctx context.Context, wsID, name string) (Chapter, error) {
	id := uid("ch")
	var pos int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM chapters WHERE workspace_id=$1`, wsID).Scan(&pos); err != nil {
		return Chapter{}, err
	}
	if _, err := s.pool.Exec(ctx, `INSERT INTO chapters (id, workspace_id, name, position) VALUES ($1,$2,$3,$4)`, id, wsID, name, pos); err != nil {
		return Chapter{}, err
	}
	return Chapter{ID: id, WorkspaceID: wsID, Name: name, Order: pos, FileIDs: []string{}}, nil
}

func (s *Store) UpdateChapter(ctx context.Context, id string, p ChapterPatch) (Chapter, error) {
	ct, err := s.pool.Exec(ctx, `UPDATE chapters SET name=COALESCE($2,name), position=COALESCE($3,position) WHERE id=$1`, id, p.Name, p.Order)
	if err != nil {
		return Chapter{}, err
	}
	if ct.RowsAffected() == 0 {
		return Chapter{}, ErrNotFound
	}
	var c Chapter
	err = s.pool.QueryRow(ctx, `SELECT c.id, c.workspace_id, c.name, c.position, `+chFiles+` FROM chapters c WHERE c.id=$1`, id).
		Scan(&c.ID, &c.WorkspaceID, &c.Name, &c.Order, &c.FileIDs)
	return c, err
}

func (s *Store) ReorderChapters(ctx context.Context, ids []string) error {
	for i, id := range ids {
		if _, err := s.pool.Exec(ctx, `UPDATE chapters SET position=$2 WHERE id=$1`, id, i); err != nil {
			return err
		}
	}
	return nil
}

// DeleteChapter removes the chapter; files keep existing (ON DELETE SET NULL
// unfiles them) per the product rule.
func (s *Store) DeleteChapter(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM chapters WHERE id=$1`, id)
	return err
}

const fileCols = `id, workspace_id, chapter_id, name, kind, size_kb, added_at, status, url, content`

func scanFile(row pgx.Row) (File, error) {
	var f File
	err := row.Scan(&f.ID, &f.WorkspaceID, &f.ChapterID, &f.Name, &f.Kind, &f.SizeKb, &f.AddedAt, &f.Status, &f.URL, &f.Content)
	return f, err
}

func (s *Store) ListFiles(ctx context.Context, userID, wsID string) ([]File, error) {
	const fCols = `f.id, f.workspace_id, f.chapter_id, f.name, f.kind, f.size_kb, f.added_at, f.status, f.url, f.content`
	q := `SELECT ` + fileCols + ` FROM files`
	args := []any{}
	if wsID != "" {
		q += ` WHERE workspace_id=$1`
		args = append(args, wsID)
	} else if userID != "" {
		q = `SELECT ` + fCols + ` FROM files f JOIN workspaces w ON w.id=f.workspace_id WHERE w.user_id=$1`
		args = append(args, userID)
	}
	q += ` ORDER BY added_at DESC`
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []File{}
	for rows.Next() {
		f, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (s *Store) GetFile(ctx context.Context, id string) (File, error) {
	f, err := scanFile(s.pool.QueryRow(ctx, `SELECT `+fileCols+` FROM files WHERE id=$1`, id))
	if isNoRows(err) {
		return f, ErrNotFound
	}
	return f, err
}

func (s *Store) AddSource(ctx context.Context, wsID, name, kind string, chapterID *string, sizeKb int) (File, error) {
	id := uid("f")
	// Phase 1: no pipeline yet, so sources land 'ready'. Phase 2 sets
	// 'processing' and enqueues an ingest job in the same transaction.
	_, err := s.pool.Exec(ctx, `INSERT INTO files (id, workspace_id, chapter_id, name, kind, size_kb, status)
		VALUES ($1,$2,$3,$4,$5,$6,'ready')`, id, wsID, chapterID, name, kind, sizeKb)
	if err != nil {
		return File{}, err
	}
	return s.GetFile(ctx, id)
}

/* --------------------------------------------------------- quizzes/attempts */

const quizCols = `id, name, workspace_id, workspace_name, chapters, questions, created_at, privacy, time_limit_min`

func scanQuiz(row pgx.Row) (Quiz, error) {
	var q Quiz
	var wsID *string
	err := row.Scan(&q.ID, &q.Name, &wsID, &q.WorkspaceName, &q.Chapters, &q.Questions, &q.CreatedAt, &q.Privacy, &q.TimeLimitMin)
	if wsID != nil {
		q.WorkspaceID = *wsID
	}
	return q, err
}

func (s *Store) ListQuizzes(ctx context.Context, userID string) ([]Quiz, error) {
	rows, err := s.pool.Query(ctx, `SELECT q.id, q.name, q.workspace_id, q.workspace_name, q.chapters, q.questions, q.created_at, q.privacy, q.time_limit_min
		FROM quizzes q JOIN workspaces w ON w.id=q.workspace_id WHERE w.user_id=$1 ORDER BY q.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Quiz{}
	for rows.Next() {
		q, err := scanQuiz(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

func (s *Store) GetQuiz(ctx context.Context, id string) (Quiz, error) {
	q, err := scanQuiz(s.pool.QueryRow(ctx, `SELECT `+quizCols+` FROM quizzes WHERE id=$1`, id))
	if isNoRows(err) {
		return q, ErrNotFound
	}
	return q, err
}

func (s *Store) CreateQuiz(ctx context.Context, q Quiz) (Quiz, error) {
	if q.ID == "" {
		q.ID = uid("qz")
	}
	if len(q.Questions) == 0 {
		q.Questions = json.RawMessage("[]")
	}
	if q.Chapters == nil {
		q.Chapters = []string{}
	}
	_, err := s.pool.Exec(ctx, `INSERT INTO quizzes (id, name, workspace_id, workspace_name, chapters, questions, privacy, time_limit_min)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		q.ID, q.Name, nullStr(q.WorkspaceID), q.WorkspaceName, q.Chapters, []byte(q.Questions), q.Privacy, q.TimeLimitMin)
	if err != nil {
		return Quiz{}, err
	}
	return s.GetQuiz(ctx, q.ID)
}

func (s *Store) UpdateQuiz(ctx context.Context, id string, p QuizPatch) (Quiz, error) {
	var questions []byte
	if p.Questions != nil {
		questions = []byte(*p.Questions)
	}
	ct, err := s.pool.Exec(ctx, `UPDATE quizzes SET
		name=COALESCE($2,name), chapters=COALESCE($3,chapters),
		questions=COALESCE($4,questions), privacy=COALESCE($5,privacy),
		time_limit_min=COALESCE($6,time_limit_min) WHERE id=$1`,
		id, p.Name, p.Chapters, questions, p.Privacy, p.TimeLimitMin)
	if err != nil {
		return Quiz{}, err
	}
	if ct.RowsAffected() == 0 {
		return Quiz{}, ErrNotFound
	}
	return s.GetQuiz(ctx, id)
}

func (s *Store) DeleteQuiz(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM quizzes WHERE id=$1`, id)
	return err
}

func (s *Store) ListAttempts(ctx context.Context, userID string) ([]Attempt, error) {
	rows, err := s.pool.Query(ctx, `SELECT a.id, a.quiz_id, a.quiz_name, a.workspace_name, a.chapters, a.correct, a.total, a.pct, a.taken_at
		FROM attempts a JOIN quizzes q ON q.id=a.quiz_id JOIN workspaces w ON w.id=q.workspace_id
		WHERE w.user_id=$1 ORDER BY a.taken_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Attempt{}
	for rows.Next() {
		var a Attempt
		if err := rows.Scan(&a.ID, &a.QuizID, &a.QuizName, &a.WorkspaceName, &a.Chapters, &a.Correct, &a.Total, &a.Pct, &a.TakenAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) CreateAttempt(ctx context.Context, quizID string, correct, total int) (Attempt, error) {
	q, err := s.GetQuiz(ctx, quizID)
	if err != nil && err != ErrNotFound {
		return Attempt{}, err
	}
	pct := 0
	if total > 0 {
		pct = int(float64(correct) / float64(total) * 100.0)
	}
	a := Attempt{
		ID: uid("at"), QuizID: quizID, QuizName: q.Name, WorkspaceName: q.WorkspaceName,
		Chapters: q.Chapters, Correct: correct, Total: total, Pct: pct, TakenAt: time.Now().UTC(),
	}
	if a.Chapters == nil {
		a.Chapters = []string{}
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO attempts (id, quiz_id, quiz_name, workspace_name, chapters, correct, total, pct, taken_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, a.ID, a.QuizID, a.QuizName, a.WorkspaceName, a.Chapters, a.Correct, a.Total, a.Pct, a.TakenAt)
	return a, err
}

/* -------------------------------------------------------------- flashcards */

func (s *Store) ListDecks(ctx context.Context, userID string) ([]Deck, error) {
	rows, err := s.pool.Query(ctx, `SELECT d.id, d.name, COALESCE(d.workspace_id,''), d.workspace_name, d.color, d.card_count, d.known_pct
		FROM decks d JOIN workspaces w ON w.id=d.workspace_id WHERE w.user_id=$1 ORDER BY d.name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Deck{}
	for rows.Next() {
		var d Deck
		if err := rows.Scan(&d.ID, &d.Name, &d.WorkspaceID, &d.WorkspaceName, &d.Color, &d.CardCount, &d.KnownPct); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) GetDeck(ctx context.Context, id string) (Deck, error) {
	var d Deck
	err := s.pool.QueryRow(ctx, `SELECT id, name, COALESCE(workspace_id,''), workspace_name, color, card_count, known_pct FROM decks WHERE id=$1`, id).
		Scan(&d.ID, &d.Name, &d.WorkspaceID, &d.WorkspaceName, &d.Color, &d.CardCount, &d.KnownPct)
	if isNoRows(err) {
		return d, ErrNotFound
	}
	return d, err
}

func (s *Store) ListCards(ctx context.Context, deckID string) ([]Flashcard, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, deck_id, front, back, known FROM cards WHERE deck_id=$1 ORDER BY id`, deckID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Flashcard{}
	for rows.Next() {
		var c Flashcard
		if err := rows.Scan(&c.ID, &c.DeckID, &c.Front, &c.Back, &c.Known); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) UpdateCard(ctx context.Context, id string, p CardPatch) (Flashcard, error) {
	ct, err := s.pool.Exec(ctx, `UPDATE cards SET front=COALESCE($2,front), back=COALESCE($3,back), known=COALESCE($4,known) WHERE id=$1`,
		id, p.Front, p.Back, p.Known)
	if err != nil {
		return Flashcard{}, err
	}
	if ct.RowsAffected() == 0 {
		return Flashcard{}, ErrNotFound
	}
	var c Flashcard
	err = s.pool.QueryRow(ctx, `SELECT id, deck_id, front, back, known FROM cards WHERE id=$1`, id).
		Scan(&c.ID, &c.DeckID, &c.Front, &c.Back, &c.Known)
	return c, err
}

/* ---------------------------------------------------------------- schedule */

func (s *Store) ListLabels(ctx context.Context) ([]Label, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, color FROM labels ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Label{}
	for rows.Next() {
		var l Label
		if err := rows.Scan(&l.ID, &l.Name, &l.Color); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

const eventCols = `id, title, start_at, end_at, label_ids, location, note`

func scanEvent(row pgx.Row) (Event, error) {
	var e Event
	err := row.Scan(&e.ID, &e.Title, &e.Start, &e.End, &e.LabelIDs, &e.Location, &e.Note)
	return e, err
}

func (s *Store) ListEvents(ctx context.Context, userID string) ([]Event, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+eventCols+` FROM events WHERE user_id=$1 ORDER BY start_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Event{}
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) CreateEvent(ctx context.Context, userID string, e Event) (Event, error) {
	e.ID = uid("ev")
	if e.LabelIDs == nil {
		e.LabelIDs = []string{}
	}
	_, err := s.pool.Exec(ctx, `INSERT INTO events (id, user_id, title, start_at, end_at, label_ids, location, note)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, e.ID, userID, e.Title, e.Start, e.End, e.LabelIDs, e.Location, e.Note)
	if err != nil {
		return Event{}, err
	}
	return e, nil
}

func (s *Store) UpdateEvent(ctx context.Context, id string, p EventPatch) (Event, error) {
	ct, err := s.pool.Exec(ctx, `UPDATE events SET
		title=COALESCE($2,title), start_at=COALESCE($3,start_at), end_at=COALESCE($4,end_at),
		label_ids=COALESCE($5,label_ids), location=COALESCE($6,location), note=COALESCE($7,note) WHERE id=$1`,
		id, p.Title, p.Start, p.End, p.LabelIDs, p.Location, p.Note)
	if err != nil {
		return Event{}, err
	}
	if ct.RowsAffected() == 0 {
		return Event{}, ErrNotFound
	}
	return scanEvent(s.pool.QueryRow(ctx, `SELECT `+eventCols+` FROM events WHERE id=$1`, id))
}

func (s *Store) DeleteEvent(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM events WHERE id=$1`, id)
	return err
}

/* ------------------------------------------------------------------- tasks */

// ListTasks hides tasks completed before today (day-end cleanup behaviour).
func (s *Store) ListTasks(ctx context.Context, userID string) ([]Task, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, title, meta, done, due_date FROM tasks
		WHERE user_id=$1 AND NOT (done AND due_date < date_trunc('day', now())) ORDER BY due_date`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Task{}
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.Title, &t.Meta, &t.Done, &t.DueDate); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Store) UpdateTask(ctx context.Context, id string, p TaskPatch) (Task, error) {
	ct, err := s.pool.Exec(ctx, `UPDATE tasks SET title=COALESCE($2,title), meta=COALESCE($3,meta), done=COALESCE($4,done) WHERE id=$1`,
		id, p.Title, p.Meta, p.Done)
	if err != nil {
		return Task{}, err
	}
	if ct.RowsAffected() == 0 {
		return Task{}, ErrNotFound
	}
	var t Task
	err = s.pool.QueryRow(ctx, `SELECT id, title, meta, done, due_date FROM tasks WHERE id=$1`, id).
		Scan(&t.ID, &t.Title, &t.Meta, &t.Done, &t.DueDate)
	return t, err
}

/* ------------------------------------------------------------ thinking space */

func (s *Store) ListCanvases(ctx context.Context, userID string) ([]Canvas, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, updated_at, scene FROM canvases WHERE user_id=$1 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Canvas{}
	for rows.Next() {
		var c Canvas
		if err := rows.Scan(&c.ID, &c.Name, &c.UpdatedAt, &c.Scene); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) GetCanvas(ctx context.Context, id string) (Canvas, error) {
	var c Canvas
	err := s.pool.QueryRow(ctx, `SELECT id, name, updated_at, scene FROM canvases WHERE id=$1`, id).
		Scan(&c.ID, &c.Name, &c.UpdatedAt, &c.Scene)
	if isNoRows(err) {
		return c, ErrNotFound
	}
	return c, err
}

func (s *Store) CreateCanvas(ctx context.Context, userID, name string) (Canvas, error) {
	id := uid("cv")
	now := time.Now().UTC()
	if _, err := s.pool.Exec(ctx, `INSERT INTO canvases (id, user_id, name, updated_at) VALUES ($1,$2,$3,$4)`, id, userID, name, now); err != nil {
		return Canvas{}, err
	}
	return Canvas{ID: id, Name: name, UpdatedAt: now}, nil
}

func (s *Store) SaveCanvas(ctx context.Context, id string, name *string, scene json.RawMessage) (Canvas, error) {
	var scenePtr []byte
	if scene != nil {
		scenePtr = []byte(scene)
	}
	ct, err := s.pool.Exec(ctx, `UPDATE canvases SET
		name=COALESCE($2,name), scene=COALESCE($3,scene), updated_at=now() WHERE id=$1`,
		id, name, scenePtr)
	if err != nil {
		return Canvas{}, err
	}
	if ct.RowsAffected() == 0 {
		return Canvas{}, ErrNotFound
	}
	return s.GetCanvas(ctx, id)
}

/* ----------------------------------------------------------------- explore */

func (s *Store) ListPublicWorkspaces(ctx context.Context) ([]PublicWorkspace, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, color, privacy, tags, chapter_count, file_count, created_at, last_accessed_at, author, clones
		FROM public_workspaces ORDER BY clones DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PublicWorkspace{}
	for rows.Next() {
		var w PublicWorkspace
		if err := rows.Scan(&w.ID, &w.Name, &w.Color, &w.Privacy, &w.Tags, &w.ChapterCount, &w.FileCount, &w.CreatedAt, &w.LastAccessedAt, &w.Author, &w.Clones); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

func (s *Store) ListPublicQuizzes(ctx context.Context) ([]PublicQuiz, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, workspace_id, workspace_name, chapters, questions, created_at, privacy, time_limit_min, author, clones
		FROM public_quizzes ORDER BY clones DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PublicQuiz{}
	for rows.Next() {
		var w PublicQuiz
		var wsID *string
		if err := rows.Scan(&w.ID, &w.Name, &wsID, &w.WorkspaceName, &w.Chapters, &w.Questions, &w.CreatedAt, &w.Privacy, &w.TimeLimitMin, &w.Author, &w.Clones); err != nil {
			return nil, err
		}
		if wsID != nil {
			w.WorkspaceID = *wsID
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
