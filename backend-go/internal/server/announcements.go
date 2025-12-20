package server

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"math/rand"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"scholarhub/backend-go/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AnnouncementsController struct {
	db          *gorm.DB
	base        string
	mu          sync.Mutex
	locks       sync.Map
	legacyBases []string
}

type AnnouncementFile struct {
	ID        string     `json:"id"`
	Title     string     `json:"title"`
	Severity  string     `json:"severity"`
	Pinned    bool       `json:"pinned"`
	Scope     string     `json:"scope"`
	Publisher string     `json:"publisher"`
	PublishAt time.Time  `json:"publishAt"`
	ValidFrom *time.Time `json:"validFrom"`
	ValidTo   *time.Time `json:"validTo"`
	Markdown  string     `json:"markdown"`
	HTML      string     `json:"html"`
	Archived  bool       `json:"archived"`
	Read      bool       `json:"read,omitempty"`
	Fav       bool       `json:"fav,omitempty"`
}

func NewAnnouncementsController(db *gorm.DB) *AnnouncementsController {
	dir := os.Getenv("ANNOUNCE_DIR")
	if dir == "" {
		if pr := os.Getenv("PROJECT_ROOT"); pr != "" {
			dir = filepath.Join(pr, "announcements")
		} else if runtimeOS() == "windows" {
			dir = "announcements"
		} else {
			dir = "/var/announcements"
		}
	}
	_ = os.MkdirAll(dir, 0755)
	legacy := make([]string, 0, 2)
	if runtimeOS() == "windows" {
		if dir != "announcements" {
			if fi, err := os.Stat("announcements"); err == nil && fi.IsDir() {
				legacy = append(legacy, "announcements")
			}
		}
	} else {
		if dir != "/var/announcements" {
			if fi, err := os.Stat("/var/announcements"); err == nil && fi.IsDir() {
				legacy = append(legacy, "/var/announcements")
			}
		}
	}
	ac := &AnnouncementsController{db: db, base: dir, legacyBases: legacy}
	ac.startArchive(90)
	return ac
}

func runtimeOS() string {
	return strings.ToLower(runtime.GOOS)
}

func (a *AnnouncementsController) AdminCreate(c *gin.Context) {
	var req struct {
		Title     string `json:"title"`
		Markdown  string `json:"markdown"`
		Scope     string `json:"scope"`
		Severity  string `json:"severity"`
		Pinned    *bool  `json:"pinned"`
		ValidFrom *int64 `json:"validFrom"`
		ValidTo   *int64 `json:"validTo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, respErr(1002, "bad_request"))
		return
	}
	title := strings.TrimSpace(req.Title)
	if title == "" || len([]rune(title)) > 100 {
		c.JSON(400, respErr(1002, "invalid_title"))
		return
	}
	md := strings.TrimSpace(req.Markdown)
	scope := strings.ToUpper(strings.TrimSpace(req.Scope))
	if scope == "" {
		scope = "ALL"
	}
	sev := strings.ToUpper(strings.TrimSpace(req.Severity))
	if sev == "" {
		sev = "NORMAL"
	}
	var vf *time.Time
	var vt *time.Time
	if req.ValidFrom != nil && *req.ValidFrom > 0 {
		t := time.UnixMilli(*req.ValidFrom)
		vf = &t
	}
	if req.ValidTo != nil && *req.ValidTo > 0 {
		t := time.UnixMilli(*req.ValidTo)
		vt = &t
	}
	html := sanitizeHTML(md2html(md))
	id := genID()
	now := time.Now().UTC()
	fn := a.makePath(now, id)
	pinned := false
	if req.Pinned != nil {
		pinned = *req.Pinned
	}
	if err := a.writeJSON(fn, AnnouncementFile{
		ID:        id,
		Title:     title,
		Severity:  sev,
		Pinned:    pinned,
		Scope:     scope,
		Publisher: c.GetString("user_id"),
		PublishAt: now,
		ValidFrom: vf,
		ValidTo:   vt,
		Markdown:  md,
		HTML:      html,
	}); err != nil {
		c.JSON(500, respErr(1004, "write_error"))
		return
	}
	a.logAction(c.GetString("user_id"), "CREATE_ANNOUNCEMENT", id, gin.H{"title": title, "severity": sev, "scope": scope})
	c.JSON(200, respOk(gin.H{"id": id}))
}

func (a *AnnouncementsController) logAction(adminID, actionType, targetID string, details interface{}) {
	var detailStr *string
	if details != nil {
		b, _ := json.Marshal(details)
		s := string(b)
		detailStr = &s
	}
	a.db.Create(&models.AdminLog{
		AdminID:    adminID,
		ActionType: actionType,
		TargetID:   targetID,
		Details:    detailStr,
	})
}

func (a *AnnouncementsController) AdminUpdate(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Title     *string `json:"title"`
		Markdown  *string `json:"markdown"`
		Scope     *string `json:"scope"`
		Severity  *string `json:"severity"`
		Pinned    *bool   `json:"pinned"`
		ValidFrom *int64  `json:"validFrom"`
		ValidTo   *int64  `json:"validTo"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, respErr(1002, "bad_request"))
		return
	}
	af, path := a.findByID(id)
	if af == nil {
		c.JSON(404, respErr(1006, "not_found"))
		return
	}
	if req.Title != nil {
		t := strings.TrimSpace(*req.Title)
		if t == "" || len([]rune(t)) > 100 {
			c.JSON(400, respErr(1002, "invalid_title"))
			return
		}
		af.Title = t
	}
	if req.Markdown != nil {
		md := strings.TrimSpace(*req.Markdown)
		af.Markdown = md
		af.HTML = sanitizeHTML(md2html(md))
	}
	if req.Scope != nil {
		s := strings.ToUpper(strings.TrimSpace(*req.Scope))
		if s == "" {
			s = "ALL"
		}
		af.Scope = s
	}
	if req.Severity != nil {
		s := strings.ToUpper(strings.TrimSpace(*req.Severity))
		if s == "" {
			s = "NORMAL"
		}
		af.Severity = s
	}
	if req.Pinned != nil {
		af.Pinned = *req.Pinned
	}
	if req.ValidFrom != nil && *req.ValidFrom > 0 {
		t := time.UnixMilli(*req.ValidFrom)
		af.ValidFrom = &t
	}
	if req.ValidTo != nil && *req.ValidTo > 0 {
		t := time.UnixMilli(*req.ValidTo)
		af.ValidTo = &t
	}
	if err := a.writeJSON(path, *af); err != nil {
		c.JSON(500, respErr(1004, "write_error"))
		return
	}
	a.logAction(c.GetString("user_id"), "UPDATE_ANNOUNCEMENT", id, gin.H{"title": af.Title})
	c.JSON(200, respOk(gin.H{"ok": true}))
}

func (a *AnnouncementsController) AdminDelete(c *gin.Context) {
	id := c.Param("id")
	af, path := a.findByID(id)
	if af == nil {
		c.JSON(404, respErr(1006, "not_found"))
		return
	}
	if err := os.Remove(path); err != nil {
		c.JSON(500, respErr(1004, "delete_error"))
		return
	}
	a.logAction(c.GetString("user_id"), "DELETE_ANNOUNCEMENT", id, nil)
	c.JSON(200, respOk(gin.H{"ok": true}))
}

func (a *AnnouncementsController) AdminList(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if pageSize < 1 {
		pageSize = 10
	}
	sev := strings.ToUpper(strings.TrimSpace(c.Query("severity")))
	items := a.scanAll()
	if sev != "" {
		tmp := make([]AnnouncementFile, 0, len(items))
		for _, x := range items {
			if strings.ToUpper(x.Severity) == sev {
				tmp = append(tmp, x)
			}
		}
		items = tmp
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Pinned != items[j].Pinned {
			return items[i].Pinned && !items[j].Pinned
		}
		return items[i].PublishAt.After(items[j].PublishAt)
	})
	total := len(items)
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	c.JSON(200, respOk(gin.H{"items": items[start:end], "total": total}))
}

func (a *AnnouncementsController) PublicList(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if pageSize < 1 {
		pageSize = 10
	}
	sev := strings.ToUpper(strings.TrimSpace(c.Query("severity")))
	status := strings.ToLower(strings.TrimSpace(c.Query("status")))
	now := time.Now()
	uid := c.GetString("user_id")
	st := a.readUserState(uid)
	items := a.scanAll()
	out := make([]AnnouncementFile, 0, len(items))
	for _, x := range items {
		if x.Archived {
			continue
		}
		if x.ValidFrom != nil && now.Before(*x.ValidFrom) {
			continue
		}
		if x.ValidTo != nil && now.After(*x.ValidTo) {
			continue
		}
		if sev != "" && strings.ToUpper(x.Severity) != sev {
			continue
		}
		if strings.ToUpper(x.Scope) != "ALL" {
			continue
		}
		if st != nil {
			x.Read = st.Read[x.ID]
			x.Fav = st.Fav[x.ID]
		}
		if status == "unread" && x.Read {
			continue
		}
		out = append(out, x)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Pinned != out[j].Pinned {
			return out[i].Pinned && !out[j].Pinned
		}
		return out[i].PublishAt.After(out[j].PublishAt)
	})
	total := len(out)
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	c.JSON(200, respOk(gin.H{"items": out[start:end], "total": total}))
}

func (a *AnnouncementsController) PublicDetail(c *gin.Context) {
	id := c.Param("id")
	af, _ := a.findByID(id)
	if af == nil {
		c.JSON(404, respErr(1006, "not_found"))
		return
	}
	uid := c.GetString("user_id")
	if uid != "" {
		if st := a.readUserState(uid); st != nil {
			af.Read = st.Read[af.ID]
			af.Fav = st.Fav[af.ID]
		}
	}
	c.JSON(200, respOk(af))
}

func (a *AnnouncementsController) PublicMarkRead(c *gin.Context) {
	id := c.Param("id")
	uid := c.GetString("user_id")
	if uid == "" {
		c.JSON(401, respErr(1001, "unauthorized"))
		return
	}
	st := a.readUserState(uid)
	if st == nil {
		st = &userState{Read: map[string]bool{}, Fav: map[string]bool{}}
	}
	st.Read[id] = true
	_ = a.writeUserState(uid, *st)
	c.JSON(200, respOk(gin.H{"ok": true}))
}

func (a *AnnouncementsController) PublicToggleFavorite(c *gin.Context) {
	id := c.Param("id")
	uid := c.GetString("user_id")
	if uid == "" {
		c.JSON(401, respErr(1001, "unauthorized"))
		return
	}
	st := a.readUserState(uid)
	if st == nil {
		st = &userState{Read: map[string]bool{}, Fav: map[string]bool{}}
	}
	if st.Fav[id] {
		delete(st.Fav, id)
	} else {
		st.Fav[id] = true
	}
	_ = a.writeUserState(uid, *st)
	c.JSON(200, respOk(gin.H{"fav": st.Fav[id]}))
}

func (a *AnnouncementsController) PublicBatchMarkRead(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, respErr(1002, "bad_request"))
		return
	}
	uid := c.GetString("user_id")
	if uid == "" {
		c.JSON(401, respErr(1001, "unauthorized"))
		return
	}
	if len(req.IDs) == 0 {
		c.JSON(200, respOk(gin.H{"ok": true}))
		return
	}
	st := a.readUserState(uid)
	if st == nil {
		st = &userState{Read: map[string]bool{}, Fav: map[string]bool{}}
	}
	for _, id := range req.IDs {
		if id = strings.TrimSpace(id); id != "" {
			st.Read[id] = true
		}
	}
	_ = a.writeUserState(uid, *st)
	c.JSON(200, respOk(gin.H{"ok": true}))
}

func (a *AnnouncementsController) PublicUnreadCount(c *gin.Context) {
	uid := c.GetString("user_id")
	if uid == "" {
		c.JSON(200, respOk(gin.H{"count": 0}))
		return
	}
	st := a.readUserState(uid)
	items := a.scanAll()
	now := time.Now()
	count := 0
	for _, x := range items {
		if x.Archived {
			continue
		}
		if x.ValidFrom != nil && now.Before(*x.ValidFrom) {
			continue
		}
		if x.ValidTo != nil && now.After(*x.ValidTo) {
			continue
		}
		if strings.ToUpper(x.Scope) != "ALL" {
			continue
		}
		if st == nil || !st.Read[x.ID] {
			count++
		}
	}
	c.JSON(200, respOk(gin.H{"count": count}))
}

func (a *AnnouncementsController) makePath(t time.Time, id string) string {
	dir := filepath.Join(a.base, t.Format("20060102"))
	_ = os.MkdirAll(dir, 0755)
	return filepath.Join(dir, id+".json")
}

func (a *AnnouncementsController) writeJSON(path string, v AnnouncementFile) error {
	a.getLock(v.ID).Lock()
	defer a.getLock(v.ID).Unlock()
	tmp := path + ".tmp"
	b, _ := json.Marshal(v)
	if err := os.WriteFile(tmp, b, 0644); err != nil {
		return err
	}
	if err := os.Chmod(tmp, 0644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (a *AnnouncementsController) scanAll() []AnnouncementFile {
	roots := append([]string{a.base}, a.legacyBases...)
	m := make(map[string]AnnouncementFile, 64)
	for _, root := range roots {
		_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if d.IsDir() {
				if strings.Contains(path, "archive") {
					return filepath.SkipDir
				}
				return nil
			}
			if !strings.HasSuffix(strings.ToLower(path), ".json") {
				return nil
			}
			b, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			var af AnnouncementFile
			if err := json.Unmarshal(b, &af); err != nil {
				return nil
			}
			if af.ID == "" {
				return nil
			}
			if _, ok := m[af.ID]; ok {
				return nil
			}
			m[af.ID] = af
			return nil
		})
	}
	items := make([]AnnouncementFile, 0, len(m))
	for _, v := range m {
		items = append(items, v)
	}
	return items
}

func (a *AnnouncementsController) findByID(id string) (*AnnouncementFile, string) {
	roots := append([]string{a.base}, a.legacyBases...)
	for _, root := range roots {
		var found *AnnouncementFile
		var foundPath string
		_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if d.IsDir() {
				return nil
			}
			if !strings.HasSuffix(strings.ToLower(path), ".json") {
				return nil
			}
			b, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			var af AnnouncementFile
			if err := json.Unmarshal(b, &af); err != nil {
				return nil
			}
			if af.ID == id {
				found = &af
				foundPath = path
				return fmt.Errorf("stop")
			}
			return nil
		})
		if found != nil {
			return found, foundPath
		}
	}
	return nil, ""
}

type userState struct {
	Read map[string]bool `json:"read"`
	Fav  map[string]bool `json:"fav"`
}

func (a *AnnouncementsController) userStatePath(uid string) string {
	dir := filepath.Join(a.base, "user_states")
	_ = os.MkdirAll(dir, 0755)
	return filepath.Join(dir, uid+".json")
}

func (a *AnnouncementsController) readUserState(uid string) *userState {
	p := a.userStatePath(uid)
	b, err := os.ReadFile(p)
	if err == nil {
		var st userState
		if err := json.Unmarshal(b, &st); err == nil {
			return &st
		}
	}
	for _, root := range a.legacyBases {
		p2 := filepath.Join(root, "user_states", uid+".json")
		if b2, err2 := os.ReadFile(p2); err2 == nil {
			var st userState
			if err := json.Unmarshal(b2, &st); err == nil {
				return &st
			}
		}
	}
	return nil
}

func (a *AnnouncementsController) writeUserState(uid string, st userState) error {
	p := a.userStatePath(uid)
	b, _ := json.Marshal(st)
	tmp := p + ".tmp"
	if err := os.WriteFile(tmp, b, 0644); err != nil {
		return err
	}
	if err := os.Chmod(tmp, 0644); err != nil {
		return err
	}
	return os.Rename(tmp, p)
}

func (a *AnnouncementsController) getLock(id string) *sync.Mutex {
	v, _ := a.locks.LoadOrStore(id, &sync.Mutex{})
	return v.(*sync.Mutex)
}

func (a *AnnouncementsController) startArchive(days int) {
	go func() {
		t := time.NewTicker(1 * time.Hour)
		defer t.Stop()
		for {
			cutoff := time.Now().AddDate(0, 0, -days)
			_ = filepath.WalkDir(a.base, func(path string, d fs.DirEntry, err error) error {
				if err != nil {
					return nil
				}
				if d.IsDir() {
					return nil
				}
				if !strings.HasSuffix(strings.ToLower(path), ".json") {
					return nil
				}
				b, err := os.ReadFile(path)
				if err != nil {
					return nil
				}
				var af AnnouncementFile
				if err := json.Unmarshal(b, &af); err != nil {
					return nil
				}
				if af.PublishAt.Before(cutoff) && !af.Archived {
					af.Archived = true
					_ = a.writeJSON(path, af)
				}
				return nil
			})
			select {
			case <-t.C:
			}
		}
	}()
}

func genID() string {
	n := time.Now().UnixNano()
	return fmt.Sprintf("%d%06d", n, rand.Intn(1000000))
}

func md2html(md string) string {
	lines := strings.Split(md, "\n")
	var out []string
	code := false
	for _, ln := range lines {
		if strings.HasPrefix(strings.TrimSpace(ln), "```") {
			if !code {
				out = append(out, "<pre><code>")
				code = true
			} else {
				out = append(out, "</code></pre>")
				code = false
			}
			continue
		}
		if code {
			out = append(out, htmlEscape(ln))
			continue
		}
		if strings.HasPrefix(ln, "# ") {
			out = append(out, "<h1>"+htmlEscape(strings.TrimPrefix(ln, "# "))+"</h1>")
			continue
		}
		if strings.HasPrefix(ln, "## ") {
			out = append(out, "<h2>"+htmlEscape(strings.TrimPrefix(ln, "## "))+"</h2>")
			continue
		}
		if strings.HasPrefix(ln, "### ") {
			out = append(out, "<h3>"+htmlEscape(strings.TrimPrefix(ln, "### "))+"</h3>")
			continue
		}
		ln2 := ln
		ln2 = boldItalic(ln2)
		out = append(out, "<p>"+ln2+"</p>")
	}
	if code {
		out = append(out, "</code></pre>")
	}
	return strings.Join(out, "\n")
}

func boldItalic(s string) string {
	s = regexp.MustCompile(`\*\*([^\*]+)\*\*`).ReplaceAllString(s, "<b>$1</b>")
	s = regexp.MustCompile(`\*([^*]+)\*`).ReplaceAllString(s, "<i>$1</i>")
	return htmlEscape(s)
}

func htmlEscape(s string) string {
	r := strings.ReplaceAll(s, "&", "&amp;")
	r = strings.ReplaceAll(r, "<", "&lt;")
	r = strings.ReplaceAll(r, ">", "&gt;")
	return r
}

func sanitizeHTML(h string) string {
	x := strings.ReplaceAll(h, "<script", "")
	x = regexp.MustCompile(`on[a-zA-Z]+\s*=`).ReplaceAllString(x, "")
	return x
}
