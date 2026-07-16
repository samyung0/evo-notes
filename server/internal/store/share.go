package store

import (
	"context"
	"time"

	"github.com/evonotes/server/internal/mdblock"
)

/* -------------------------------------------------------------- access checks

Sharing model: `privacy` on workspaces and materials is enforced at read time.
  - owner        → full read/write
  - link/public  → any authenticated user may read (and clone)
  - private      → owner only (404 for everyone else, like AssertWorkspaceOwner)
A material is readable when the material itself OR its parent workspace is
link/public — publishing a workspace implicitly publishes everything inside. */

// WorkspaceAccess reports whether userID may read wsID. isOwner is true for
// the owner; (false, nil) means shared read access (privacy link/public).
func (s *Store) WorkspaceAccess(ctx context.Context, userID, wsID string) (isOwner bool, err error) {
	var owner *string
	var privacy Privacy
	e := s.pool.QueryRow(ctx, `SELECT user_id, privacy FROM workspaces WHERE id=$1`, wsID).Scan(&owner, &privacy)
	if isNoRows(e) {
		return false, ErrNotFound
	}
	if e != nil {
		return false, e
	}
	if owner != nil && *owner == userID {
		return true, nil
	}
	if privacy == PrivacyLink || privacy == PrivacyPublic {
		return false, nil
	}
	return false, ErrNotFound
}

// MaterialAccess reports whether userID may read the material. Readable when
// the user owns the parent workspace, or the material itself is shared, or the
// parent workspace is shared.
func (s *Store) MaterialAccess(ctx context.Context, userID, matID string) (isOwner bool, err error) {
	var owner *string
	var matPrivacy, wsPrivacy Privacy
	e := s.pool.QueryRow(ctx, `SELECT w.user_id, m.privacy, w.privacy
		FROM materials m JOIN workspaces w ON w.id=m.workspace_id WHERE m.id=$1`, matID).
		Scan(&owner, &matPrivacy, &wsPrivacy)
	if isNoRows(e) {
		return false, ErrNotFound
	}
	if e != nil {
		return false, e
	}
	if owner != nil && *owner == userID {
		return true, nil
	}
	if matPrivacy == PrivacyLink || matPrivacy == PrivacyPublic ||
		wsPrivacy == PrivacyLink || wsPrivacy == PrivacyPublic {
		return false, nil
	}
	return false, ErrNotFound
}

// FileWorkspaceID resolves the owning workspace of a file (for access checks).
func (s *Store) FileWorkspaceID(ctx context.Context, fileID string) (string, error) {
	var wsID string
	err := s.pool.QueryRow(ctx, `SELECT workspace_id FROM files WHERE id=$1`, fileID).Scan(&wsID)
	if isNoRows(err) {
		return "", ErrNotFound
	}
	return wsID, err
}

// CardMaterialID resolves the deck (flashcards material) owning a card.
func (s *Store) CardMaterialID(ctx context.Context, cardID string) (string, error) {
	var matID string
	err := s.pool.QueryRow(ctx, `SELECT material_id FROM card_stats WHERE card_id=$1`, cardID).Scan(&matID)
	if isNoRows(err) {
		return "", ErrNotFound
	}
	return matID, err
}

// ChapterWorkspaceID resolves the owning workspace of a chapter.
func (s *Store) ChapterWorkspaceID(ctx context.Context, chapterID string) (string, error) {
	var wsID string
	err := s.pool.QueryRow(ctx, `SELECT workspace_id FROM chapters WHERE id=$1`, chapterID).Scan(&wsID)
	if isNoRows(err) {
		return "", ErrNotFound
	}
	return wsID, err
}

// GetWorkspaceShared reads a workspace without asserting ownership (the caller
// must have verified access via WorkspaceAccess).
func (s *Store) GetWorkspaceShared(ctx context.Context, id string) (Workspace, error) {
	w, err := scanWorkspace(s.pool.QueryRow(ctx, "SELECT "+wsCols+" FROM workspaces w WHERE w.id=$1", id))
	if isNoRows(err) {
		return w, ErrNotFound
	}
	return w, err
}

/* ------------------------------------------------------------------- explore

Explore reads live rows: everything with privacy='public' plus its author name
and clone counter. The seeded public_* snapshot tables are no longer used. */

func (s *Store) ListPublicWorkspaces(ctx context.Context) ([]PublicWorkspace, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+wsCols+`, COALESCE(u.name,'Unknown'), w.clone_count
		FROM workspaces w LEFT JOIN users u ON u.id=w.user_id
		WHERE w.privacy='public' ORDER BY w.clone_count DESC, w.created_at DESC`)
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
	rows, err := s.pool.Query(ctx, `SELECT m.id, m.workspace_id, m.workspace_name, m.kind, m.title, m.content, m.chapter_id, m.scope_chapters, m.scope_file_ids, m.privacy, m.color, m.created_at,
			COALESCE(u.name,'Unknown'), m.clone_count
		FROM materials m JOIN workspaces w ON w.id=m.workspace_id LEFT JOIN users u ON u.id=w.user_id
		WHERE m.kind='quiz' AND (m.privacy='public' OR w.privacy='public')
		ORDER BY m.clone_count DESC, m.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PublicQuiz{}
	for rows.Next() {
		var mt Material
		var author string
		var clones int
		if err := rows.Scan(&mt.ID, &mt.WorkspaceID, &mt.WorkspaceName, &mt.Kind, &mt.Title, &mt.Content, &mt.ChapterID, &mt.ScopeChapters, &mt.ScopeFileIDs, &mt.Privacy, &mt.Color, &mt.CreatedAt, &author, &clones); err != nil {
			return nil, err
		}
		q, err := quizFromMaterial(mt)
		if err != nil {
			continue // skip unparseable content instead of failing the page
		}
		out = append(out, PublicQuiz{Quiz: q, Author: author, Clones: clones})
	}
	return out, rows.Err()
}

func (s *Store) ListPublicDecks(ctx context.Context) ([]PublicDeck, error) {
	rows, err := s.pool.Query(ctx, `SELECT m.id, m.title, COALESCE(m.workspace_id,''), m.workspace_name, m.color, m.privacy,`+deckStatsExpr+`,
			COALESCE(u.name,'Unknown'), m.clone_count
		FROM materials m JOIN workspaces w ON w.id=m.workspace_id LEFT JOIN users u ON u.id=w.user_id
		WHERE m.kind='flashcards' AND (m.privacy='public' OR w.privacy='public')
		ORDER BY m.clone_count DESC, m.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PublicDeck{}
	for rows.Next() {
		var d PublicDeck
		if err := rows.Scan(&d.ID, &d.Name, &d.WorkspaceID, &d.WorkspaceName, &d.Color, &d.Privacy, &d.CardCount, &d.KnownPct, &d.DueCount, &d.Author, &d.Clones); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

/* -------------------------------------------------------------------- cloning */

// rewriteCardIDs re-keys every card in a flashcards document. card_stats.card_id
// is a global primary key, so a cloned deck must mint fresh card ids before
// fresh (reset) SRS rows can be inserted for them.
func rewriteCardIDs(title, content string) (newContent string, newIDs []string, err error) {
	cards, err := mdblock.ParseFlashcards(content)
	if err != nil {
		return "", nil, err
	}
	newIDs = make([]string, len(cards))
	for i := range cards {
		cards[i].ID = uid("c")
		newIDs[i] = cards[i].ID
	}
	newContent, err = mdblock.FlashcardsContent(title, cards)
	return newContent, newIDs, err
}

// CloneWorkspace deep-copies a shared workspace (chapters, files, materials,
// fresh card stats) into a new workspace owned by userID. Blobs are shared by
// reference (blob_path is copied, objects are never deleted on file delete).
// LightRAG state is copied separately by the pipeline (keyed by workspace id).
// The clone lands private regardless of the source's visibility.
func (s *Store) CloneWorkspace(ctx context.Context, userID, srcID string) (Workspace, error) {
	isOwner, err := s.WorkspaceAccess(ctx, userID, srcID)
	if err != nil {
		return Workspace{}, err
	}

	src, err := s.GetWorkspaceShared(ctx, srcID)
	if err != nil {
		return Workspace{}, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Workspace{}, err
	}
	defer tx.Rollback(ctx)

	newID := uid("ws")
	name := src.Name
	if isOwner {
		name += " (copy)"
	}
	if _, err := tx.Exec(ctx, `INSERT INTO workspaces (id, user_id, name, color, privacy) VALUES ($1,$2,$3,$4,'private')`,
		newID, userID, name, src.Color); err != nil {
		return Workspace{}, err
	}

	// Chapters (old id -> new id).
	chapterMap := map[string]string{}
	{
		rows, err := tx.Query(ctx, `SELECT id, name, position FROM chapters WHERE workspace_id=$1 ORDER BY position`, srcID)
		if err != nil {
			return Workspace{}, err
		}
		type ch struct {
			id, name string
			pos      int
		}
		var chapters []ch
		for rows.Next() {
			var c ch
			if err := rows.Scan(&c.id, &c.name, &c.pos); err != nil {
				rows.Close()
				return Workspace{}, err
			}
			chapters = append(chapters, c)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return Workspace{}, err
		}
		for _, c := range chapters {
			nid := uid("ch")
			chapterMap[c.id] = nid
			if _, err := tx.Exec(ctx, `INSERT INTO chapters (id, workspace_id, name, position) VALUES ($1,$2,$3,$4)`,
				nid, newID, c.name, c.pos); err != nil {
				return Workspace{}, err
			}
		}
	}

	// Files (old id -> new id); doc_id is copied so the pipeline's LightRAG
	// row copy (keyed by workspace) keeps the file <-> document link intact.
	fileMap := map[string]string{}
	{
		rows, err := tx.Query(ctx, `SELECT id, chapter_id, name, kind, size_kb, status, parser, engine, blob_path, url, content, doc_id
			FROM files WHERE workspace_id=$1 ORDER BY added_at`, srcID)
		if err != nil {
			return Workspace{}, err
		}
		type file struct {
			id, name, kind, status              string
			chapterID, parser, engine, blobPath *string
			url, content, docID                 *string
			sizeKb                              int
		}
		var files []file
		for rows.Next() {
			var f file
			if err := rows.Scan(&f.id, &f.chapterID, &f.name, &f.kind, &f.sizeKb, &f.status, &f.parser, &f.engine, &f.blobPath, &f.url, &f.content, &f.docID); err != nil {
				rows.Close()
				return Workspace{}, err
			}
			files = append(files, f)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return Workspace{}, err
		}
		for _, f := range files {
			nid := uid("f")
			fileMap[f.id] = nid
			var chapterID *string
			if f.chapterID != nil {
				if mapped, ok := chapterMap[*f.chapterID]; ok {
					chapterID = &mapped
				}
			}
			url := f.url
			if url != nil && *url == "/api/files/"+f.id+"/raw" {
				u := "/api/files/" + nid + "/raw"
				url = &u
			}
			if _, err := tx.Exec(ctx, `INSERT INTO files (id, workspace_id, chapter_id, name, kind, size_kb, added_at, status, parser, engine, blob_path, url, content, doc_id)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
				nid, newID, chapterID, f.name, f.kind, f.sizeKb, time.Now().UTC(), f.status, f.parser, f.engine, f.blobPath, url, f.content, f.docID); err != nil {
				return Workspace{}, err
			}
		}
	}

	// Materials (clone lands private; flashcards get fresh card ids + stats).
	{
		rows, err := tx.Query(ctx, `SELECT `+materialCols+` FROM materials WHERE workspace_id=$1 ORDER BY created_at`, srcID)
		if err != nil {
			return Workspace{}, err
		}
		var materials []Material
		for rows.Next() {
			mt, err := scanMaterial(rows)
			if err != nil {
				rows.Close()
				return Workspace{}, err
			}
			materials = append(materials, mt)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return Workspace{}, err
		}
		for _, mt := range materials {
			nid := uid("mat")
			var chapterID *string
			if mt.ChapterID != nil {
				if mapped, ok := chapterMap[*mt.ChapterID]; ok {
					chapterID = &mapped
				}
			}
			scopeFiles := make([]string, 0, len(mt.ScopeFileIDs))
			for _, fid := range mt.ScopeFileIDs {
				if mapped, ok := fileMap[fid]; ok {
					scopeFiles = append(scopeFiles, mapped)
				}
			}
			content := mt.Content
			var cardIDs []string
			if mt.Kind == "flashcards" {
				if content, cardIDs, err = rewriteCardIDs(mt.Title, mt.Content); err != nil {
					return Workspace{}, err
				}
			}
			if _, err := tx.Exec(ctx, `INSERT INTO materials (id, workspace_id, workspace_name, kind, title, content, chapter_id, scope_chapters, scope_file_ids, privacy, color)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'private',$10)`,
				nid, newID, name, mt.Kind, mt.Title, content, chapterID, mt.ScopeChapters, scopeFiles, mt.Color); err != nil {
				return Workspace{}, err
			}
			for _, cid := range cardIDs {
				if _, err := tx.Exec(ctx, `INSERT INTO card_stats (card_id, material_id, srs, known) VALUES ($1,$2,$3,false)`,
					cid, nid, newSrsBytes()); err != nil {
					return Workspace{}, err
				}
			}
		}
	}

	if _, err := tx.Exec(ctx, `UPDATE workspaces SET clone_count=clone_count+1 WHERE id=$1`, srcID); err != nil {
		return Workspace{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Workspace{}, err
	}
	return s.GetWorkspace(ctx, userID, newID, false)
}

// CloneMaterial copies one shared material (quiz / deck / note / …) into the
// user's most recently used workspace. Flashcards get fresh card ids + reset
// SRS stats. The clone lands private.
func (s *Store) CloneMaterial(ctx context.Context, userID, matID string) (Material, error) {
	if _, err := s.MaterialAccess(ctx, userID, matID); err != nil {
		return Material{}, err
	}
	src, err := s.GetMaterial(ctx, matID)
	if err != nil {
		return Material{}, err
	}

	var wsID, wsName string
	if err := s.pool.QueryRow(ctx, `SELECT id, name FROM workspaces WHERE user_id=$1 ORDER BY last_accessed_at DESC LIMIT 1`, userID).
		Scan(&wsID, &wsName); err != nil {
		if isNoRows(err) {
			return Material{}, ErrNotFound
		}
		return Material{}, err
	}

	content := src.Content
	var cardIDs []string
	if src.Kind == "flashcards" {
		if content, cardIDs, err = rewriteCardIDs(src.Title, src.Content); err != nil {
			return Material{}, err
		}
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Material{}, err
	}
	defer tx.Rollback(ctx)

	nid := uid("mat")
	if _, err := tx.Exec(ctx, `INSERT INTO materials (id, workspace_id, workspace_name, kind, title, content, scope_chapters, scope_file_ids, privacy, color)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'{}','private',$8)`,
		nid, wsID, wsName, src.Kind, src.Title, content, src.ScopeChapters, src.Color); err != nil {
		return Material{}, err
	}
	for _, cid := range cardIDs {
		if _, err := tx.Exec(ctx, `INSERT INTO card_stats (card_id, material_id, srs, known) VALUES ($1,$2,$3,false)`,
			cid, nid, newSrsBytes()); err != nil {
			return Material{}, err
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE materials SET clone_count=clone_count+1 WHERE id=$1`, matID); err != nil {
		return Material{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Material{}, err
	}
	return s.GetMaterial(ctx, nid)
}

/* ---------------------------------------------------------------- deck patch */

// DeckPatch carries the mutable deck fields (the deck is a flashcards material).
type DeckPatch struct {
	Name    *string
	Color   *UserColor
	Privacy *Privacy
}

// UpdateDeck renames/recolours a deck and/or changes its visibility. Renames
// rebuild the markdown document so the embedded title stays in sync.
func (s *Store) UpdateDeck(ctx context.Context, id string, p DeckPatch) (Deck, error) {
	mt, err := s.GetMaterial(ctx, id)
	if err != nil {
		return Deck{}, err
	}
	if mt.Kind != "flashcards" {
		return Deck{}, ErrNotFound
	}
	title, color, privacy := mt.Title, mt.Color, mt.Privacy
	content := mt.Content
	if p.Name != nil && *p.Name != mt.Title {
		title = *p.Name
		cards, err := mdblock.ParseFlashcards(mt.Content)
		if err != nil {
			return Deck{}, err
		}
		if content, err = mdblock.FlashcardsContent(title, cards); err != nil {
			return Deck{}, err
		}
	}
	if p.Color != nil {
		color = *p.Color
	}
	if p.Privacy != nil {
		privacy = *p.Privacy
	}
	if _, err := s.pool.Exec(ctx, `UPDATE materials SET title=$2, content=$3, color=$4, privacy=$5 WHERE id=$1`,
		id, title, content, color, privacy); err != nil {
		return Deck{}, err
	}
	return s.GetDeck(ctx, id)
}
