package server

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"runtime"
	"scholarhub/backend-go/internal/models"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"log"

	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AdminController struct {
	db         *gorm.DB
	lastNetIn  uint64
	lastNetOut uint64
	lastSample time.Time
}

func NewAdminController(db *gorm.DB) *AdminController {
	return &AdminController{db: db}
}

// --- Helper: Log Action ---
func (a *AdminController) logAction(adminID, actionType, targetID string, details interface{}) {
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

// --- Dashboard Stats ---
func (a *AdminController) Stats(c *gin.Context) {
	var students, teachers, resources, questions int64
	tsStr := c.Query("ts")
	var tsTime *time.Time
	if tsStr != "" {
		if ms, err := strconv.ParseInt(tsStr, 10, 64); err == nil {
			t := time.UnixMilli(ms)
			tsTime = &t
		}
	}
	txStu := a.db.Model(&models.User{}).Where("role = ?", "STUDENT")
	if tsTime != nil && a.db.Migrator().HasColumn(&models.User{}, "createTime") {
		txStu = txStu.Where("\"createTime\" <= ?", *tsTime)
	}
	txStu.Count(&students)
	txTea := a.db.Model(&models.User{}).Where("role = ?", "TEACHER")
	if tsTime != nil && a.db.Migrator().HasColumn(&models.User{}, "createTime") {
		txTea = txTea.Where("\"createTime\" <= ?", *tsTime)
	}
	txTea.Count(&teachers)
	txRes := a.db.Model(&models.Resource{})
	if tsTime != nil {
		txRes = txRes.Where("\"createTime\" <= ?", *tsTime)
	}
	txRes.Count(&resources)
	txQue := a.db.Model(&models.Question{})
	if tsTime != nil {
		txQue = txQue.Where("\"createTime\" <= ?", *tsTime)
	}
	txQue.Count(&questions)
	c.JSON(http.StatusOK, respOk(gin.H{
		"students":  students,
		"teachers":  teachers,
		"resources": resources,
		"questions": questions,
	}))
}

func (a *AdminController) Health(c *gin.Context) {
	start := time.Now()
	cpuPerc := 0.0
	if vals, err := cpu.Percent(time.Millisecond*200, false); err == nil && len(vals) > 0 {
		cpuPerc = vals[0]
	}
	memPerc := 0.0
	if m, err := mem.VirtualMemory(); err == nil {
		memPerc = m.UsedPercent
	}
	root := "/"
	if runtime.GOOS == "windows" {
		drive := os.Getenv("SYSTEMDRIVE")
		if drive == "" {
			drive = "C:"
		}
		root = drive + "\\"
	}
	diskPerc := 0.0
	if du, err := disk.Usage(root); err == nil && du != nil {
		diskPerc = du.UsedPercent
	}
	var inBps, outBps float64
	var bytesIn, bytesOut uint64
	if nstats, err := net.IOCounters(false); err == nil && len(nstats) > 0 {
		bytesIn = nstats[0].BytesRecv
		bytesOut = nstats[0].BytesSent
	}
	if !a.lastSample.IsZero() {
		dt := time.Since(a.lastSample).Seconds()
		if dt > 0 {
			inBps = float64(bytesIn-a.lastNetIn) / dt
			outBps = float64(bytesOut-a.lastNetOut) / dt
		}
	}
	a.lastNetIn = bytesIn
	a.lastNetOut = bytesOut
	a.lastSample = time.Now()
	dbStart := time.Now()
	_ = a.db.Exec("SELECT 1")
	dbLatency := time.Since(dbStart).Milliseconds()
	pingURL := os.Getenv("PING_URL")
	netLatency := int64(0)
	if pingURL != "" {
		netLatency = pingLatency(pingURL, 800)
		if netLatency < 0 {
			netLatency = 0
		}
	}
	status := "Healthy"
	totalMs := time.Since(start).Milliseconds()
	severities := map[string]float64{
		"cpu":  severityCPU(cpuPerc),
		"mem":  severityMem(memPerc),
		"disk": severityDisk(diskPerc, diskClass()),
		"db":   severityDBLatency(dbLatency),
		"net":  severityNetworkLatency(netLatency),
		"svc":  severityServiceMs(totalMs),
	}
	baseWeights := map[string]float64{
		"cpu": 0.22, "mem": 0.22, "disk": 0.20, "db": 0.16, "net": 0.12, "svc": 0.08,
	}
	weights := dynamicWeights(baseWeights, severities)
	score := calcHealthScore(severities, weights)
	if score < 60 {
		status = "Critical"
	} else if score < 80 {
		status = "Warning"
	}
	breakdown := gin.H{
		"cpu":    gin.H{"value": cpuPerc, "severity": severities["cpu"], "weight": weights["cpu"], "penalty": math.Round(severities["cpu"]*weights["cpu"]*100) / 100},
		"memory": gin.H{"value": memPerc, "severity": severities["mem"], "weight": weights["mem"], "penalty": math.Round(severities["mem"]*weights["mem"]*100) / 100},
		"disk": gin.H{
			"value":      diskPerc,
			"severity":   severities["disk"],
			"weight":     weights["disk"],
			"penalty":    math.Round(severities["disk"]*weights["disk"]*100) / 100,
			"type":       diskClass(),
			"thresholds": gin.H{"normal_low": 60, "normal_high": 80, "warn": 90, "crit": 95},
		},
		"db":  gin.H{"latencyMs": dbLatency, "severity": severities["db"], "weight": weights["db"], "penalty": math.Round(severities["db"]*weights["db"]*100) / 100},
		"net": gin.H{"latencyMs": netLatency, "severity": severities["net"], "weight": weights["net"], "penalty": math.Round(severities["net"]*weights["net"]*100) / 100},
		"svc": gin.H{"latencyMs": totalMs, "severity": severities["svc"], "weight": weights["svc"], "penalty": math.Round(severities["svc"]*weights["svc"]*100) / 100},
	}
	c.JSON(http.StatusOK, respOk(gin.H{
		"score":     int(score + 0.5),
		"status":    status,
		"timestamp": time.Now().UTC(),
		"components": gin.H{
			"cpu": gin.H{
				"usedPercent": cpuPerc,
				"weight":      weights["cpu"],
				"thresholds":  gin.H{"warn": 75, "crit": 90},
			},
			"memory": gin.H{
				"usedPercent": memPerc,
				"weight":      weights["mem"],
				"thresholds":  gin.H{"warn": 75, "crit": 90},
			},
			"disk": gin.H{
				"usedPercent": diskPerc,
				"weight":      weights["disk"],
				"type":        diskClass(),
				"thresholds":  gin.H{"normal_low": 60, "normal_high": 80, "warn": 90, "crit": 95},
			},
			"db": gin.H{
				"latencyMs":  dbLatency,
				"weight":     weights["db"],
				"thresholds": gin.H{"warn": 200, "crit": 1000},
			},
			"network": gin.H{
				"inBps":      inBps,
				"outBps":     outBps,
				"latencyMs":  netLatency,
				"weight":     weights["net"],
				"thresholds": gin.H{"warn": 100, "crit": 200},
			},
		},
		"breakdown":  breakdown,
		"endpointMs": totalMs,
	}))
	log.Printf("health status=%s score=%d endpointMs=%d cpu=%.1f mem=%.1f disk=%.1f db=%d",
		status, int(score+0.5), totalMs, cpuPerc, memPerc, diskPerc, dbLatency)
}

func min(a float64, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func (a *AdminController) HealthTrend(c *gin.Context) {
	days, _ := strconv.Atoi(c.Query("days"))
	if days <= 0 {
		days = 30
	}
	start := time.Now().Add(-time.Duration(days) * 24 * time.Hour)
	var list []models.HealthSample
	a.db.Where("\"createTime\" >= ?", start).Order("\"createTime\" asc").Find(&list)
	c.JSON(http.StatusOK, respOk(gin.H{"items": list}))
}

func (a *AdminController) ServiceStatus(c *gin.Context) {
	var last models.HealthSample
	a.db.Order("\"createTime\" desc").Limit(1).Find(&last)
	ok := false
	if !last.CreateTime.IsZero() {
		if time.Since(last.CreateTime) <= 5*time.Second {
			ok = true
		}
	}
	var count24 int64
	a.db.Model(&models.HealthSample{}).Where("\"createTime\" >= ?", time.Now().Add(-24*time.Hour)).Count(&count24)
	intervalMs := 30000
	if os.Getenv("ENV") == "production" || os.Getenv("GIN_MODE") == "release" {
		intervalMs = 30000
	}
	expected := int64((24 * 60 * 60 * 1000) / intervalMs)
	completeness := 0.0
	if expected > 0 {
		completeness = float64(count24) / float64(expected) * 100
	}
	c.JSON(http.StatusOK, respOk(gin.H{
		"running":         ok,
		"lastHeartbeat":   last.CreateTime,
		"completeness24h": int(completeness + 0.5),
	}))
}

func (a *AdminController) HealthSamples(c *gin.Context) {
	sinceMs, _ := strconv.ParseInt(c.Query("since"), 10, 64)
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit <= 0 || limit > 1000 {
		limit = 100
	}
	var list []models.HealthSample
	tx := a.db.Order("\"createTime\" asc")
	if sinceMs > 0 {
		tx = tx.Where("\"createTime\" > ?", time.UnixMilli(sinceMs))
	}
	tx.Limit(limit).Find(&list)
	version := int64(0)
	if len(list) > 0 {
		version = list[len(list)-1].CreateTime.UnixMilli()
	}
	c.JSON(http.StatusOK, respOk(gin.H{"items": list, "version": version, "serverTime": time.Now().UnixMilli()}))
}

func (a *AdminController) HealthStream(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	uid := c.GetString("user_id")
	log.Printf("health_stream connect user=%s", uid)
	ch := SubscribeHealth()
	defer UnsubscribeHealth(ch)
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.Status(http.StatusInternalServerError)
		return
	}
	if _, err := fmt.Fprintf(c.Writer, "event: ready\ndata: {\"serverTime\": %d}\n\n", time.Now().UnixMilli()); err != nil {
		log.Printf("health_stream write ready error user=%s err=%v", uid, err)
		return
	}
	flusher.Flush()
	ping := time.NewTicker(15 * time.Second)
	defer ping.Stop()
	ctxDone := c.Request.Context().Done()
	for {
		select {
		case s := <-ch:
			b, _ := json.Marshal(s)
			if _, err := fmt.Fprintf(c.Writer, "event: sample\ndata: %s\n\n", string(b)); err != nil {
				log.Printf("health_stream write sample error user=%s err=%v", uid, err)
				return
			}
			flusher.Flush()
		case <-ping.C:
			if _, err := fmt.Fprintf(c.Writer, "event: ping\ndata: {}\n\n"); err != nil {
				log.Printf("health_stream write ping error user=%s err=%v", uid, err)
				return
			}
			flusher.Flush()
		case <-ctxDone:
			log.Printf("health_stream disconnect user=%s", uid)
			return
		}
	}
}

// --- Teacher Management ---

func (a *AdminController) ListTeachers(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if pageSize < 1 {
		pageSize = 20
	}
	q := strings.TrimSpace(c.Query("q"))

	tx := a.db.Model(&models.User{}).Where("role = ?", "TEACHER")
	if q != "" {
		tx = tx.Where("username ILIKE ? OR fullname ILIKE ? OR \"employeeId\" ILIKE ?", "%"+q+"%", "%"+q+"%", "%"+q+"%")
	}

	var total int64
	tx.Count(&total)

	var list []models.User
	tx.Order("id desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&list)

	c.JSON(http.StatusOK, respOk(gin.H{"items": list, "total": total}))
}

func (a *AdminController) CreateTeacher(c *gin.Context) {
	var req struct {
		Name       string
		Username   string
		Password   string
		FullName   string
		EmployeeID string
		Title      string
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}
	name := strings.TrimSpace(firstNonEmpty(req.Name, req.Username, req.FullName))
	if name == "" || strings.TrimSpace(req.Password) == "" {
		c.JSON(http.StatusBadRequest, respErr(1002, "name_password_required"))
		return
	}
	emp := strings.TrimSpace(req.EmployeeID)
	if emp == "" {
		c.JSON(http.StatusBadRequest, respErr(1002, "employee_id_required"))
		return
	}
	if !isDigits(emp) || len(emp) != 6 {
		c.JSON(http.StatusBadRequest, respErr(1002, "invalid_employee_id"))
		return
	}
	name = sanitizeName(name)
	title := normalizeTitle(strings.TrimSpace(req.Title))
	if title == "" {
		c.JSON(http.StatusBadRequest, respErr(1002, "invalid_title"))
		return
	}

	emailLocal := toPinyinName(name)
	email := emailLocal + "@edu.com"
	username := emp + "@edu"

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	var created models.User
	retries := 0
	for {
		err := a.db.Transaction(func(tx *gorm.DB) error {
			var exist models.User
			if err := tx.Where("(id = ? OR \"employeeId\" = ? OR username = ?)", emp, emp, username).First(&exist).Error; err == nil {
				return fmt.Errorf("conflict")
			}
			u := models.User{
				ID:         emp,
				Username:   username,
				Password:   string(hash),
				Role:       "TEACHER",
				Email:      email,
				FullName:   &name,
				Title:      &title,
				EmployeeID: &emp,
			}
			if err := tx.Create(&u).Error; err != nil {
				return err
			}
			created = u
			return nil
		})
		if err == nil {
			break
		}
		msg := strings.ToLower(err.Error())
		if strings.Contains(msg, "conflict") || strings.Contains(msg, "duplicate") || strings.Contains(msg, "23505") {
			if retries < 2 {
				time.Sleep(time.Duration(200*(retries+1)) * time.Millisecond)
				retries++
				continue
			}
			c.JSON(http.StatusConflict, respErr(1003, "employee_exists"))
			return
		}
		log.Printf("create_teacher error: %v", err)
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}

	adminID := c.GetString("user_id")
	a.logAction(adminID, "CREATE_TEACHER", created.ID, gin.H{"name": name, "employeeId": emp, "title": title, "email": email, "username": username})

	c.JSON(http.StatusOK, respOk(created))
}

func (a *AdminController) UpdateTeacher(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Password   string
		FullName   string
		EmployeeID string
		Title      string
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}

	var u models.User
	if err := a.db.First(&u, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, respErr(1006, "not_found"))
		return
	}

	updates := map[string]interface{}{}
	if req.FullName != "" {
		updates["fullname"] = req.FullName
	}
	if req.EmployeeID != "" {
		updates["employeeId"] = req.EmployeeID
	}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Password != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
		updates["password"] = string(hash)
	}

	if err := a.db.Model(&u).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}

	adminID := c.GetString("user_id")
	a.logAction(adminID, "UPDATE_TEACHER", id, updates)

	c.JSON(http.StatusOK, respOk(gin.H{"ok": true}))
}

func (a *AdminController) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	var u models.User
	if err := a.db.First(&u, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, respErr(1006, "not_found"))
		return
	}
	if err := a.db.Delete(&u).Error; err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}
	adminID := c.GetString("user_id")
	a.logAction(adminID, "DELETE_USER", id, nil)
	c.JSON(http.StatusOK, respOk(gin.H{"ok": true}))
}

// --- Content Audit: Resources ---

func (a *AdminController) ListAuditResources(c *gin.Context) {
	status := c.Query("status") // NORMAL, VIOLATION, PENDING
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if pageSize < 1 {
		pageSize = 20
	}

	tx := a.db.Model(&models.Resource{}).Preload("Uploader").Preload("Course")
	if status != "" {
		tx = tx.Where("status = ?", status)
	}

	var total int64
	tx.Count(&total)

	var list []models.Resource
	tx.Order("id desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&list)
	c.JSON(http.StatusOK, respOk(gin.H{"items": list, "total": total}))
}

func (a *AdminController) AuditResource(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status      string // NORMAL, VIOLATION
		Description string
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}

	updates := map[string]interface{}{}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}

	if err := a.db.Model(&models.Resource{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}

	adminID := c.GetString("user_id")
	a.logAction(adminID, "AUDIT_RESOURCE", id, req)
	c.JSON(http.StatusOK, respOk(gin.H{"ok": true}))
}

func (a *AdminController) DeleteResource(c *gin.Context) {
	id := c.Param("id")
	if err := a.db.Delete(&models.Resource{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}
	adminID := c.GetString("user_id")
	a.logAction(adminID, "DELETE_RESOURCE", id, nil)
	c.JSON(http.StatusOK, respOk(gin.H{"ok": true}))
}

// --- Content Audit: Q&A ---

func (a *AdminController) ListAuditQuestions(c *gin.Context) {
	status := c.Query("status") // UNANSWERED, ANSWERED, VIOLATION
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if pageSize < 1 {
		pageSize = 20
	}

	tx := a.db.Model(&models.Question{}).Preload("Course")
	if status != "" {
		tx = tx.Where("status = ?", status)
	}

	var total int64
	tx.Count(&total)

	var list []models.Question
	tx.Order("id desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&list)
	c.JSON(http.StatusOK, respOk(gin.H{"items": list, "total": total}))
}

func (a *AdminController) AuditQuestion(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string // VIOLATION, etc.
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}

	if err := a.db.Model(&models.Question{}).Where("id = ?", id).Update("status", req.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}

	adminID := c.GetString("user_id")
	a.logAction(adminID, "AUDIT_QUESTION", id, req)
	c.JSON(http.StatusOK, respOk(gin.H{"ok": true}))
}

func (a *AdminController) AuditAnswer(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		IsTop  *bool
		Hidden *bool
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}

	updates := map[string]interface{}{}
	if req.IsTop != nil {
		updates["isTop"] = *req.IsTop
	}
	if req.Hidden != nil {
		updates["hidden"] = *req.Hidden
	}

	if err := a.db.Model(&models.Answer{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}

	adminID := c.GetString("user_id")
	a.logAction(adminID, "AUDIT_ANSWER", id, req)
	c.JSON(http.StatusOK, respOk(gin.H{"ok": true}))
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func sanitizeName(s string) string {
	x := strings.TrimSpace(s)
	x = strings.ReplaceAll(x, "<", "")
	x = strings.ReplaceAll(x, ">", "")
	x = strings.ReplaceAll(x, "\"", "")
	x = strings.ReplaceAll(x, "'", "")
	x = strings.ReplaceAll(x, "&", "")
	return x
}

func normalizeTitle(t string) string {
	if t == "" {
		return ""
	}
	m := map[string]string{
		"讲师":                  "LECTURER",
		"助理教授":                "ASSISTANT_PROFESSOR",
		"副教授":                 "ASSOCIATE_PROFESSOR",
		"教授":                  "PROFESSOR",
		"lecturer":            "LECTURER",
		"assistant":           "ASSISTANT",
		"assistant_professor": "ASSISTANT_PROFESSOR",
		"associate_professor": "ASSOCIATE_PROFESSOR",
		"professor":           "PROFESSOR",
	}
	l := strings.ToLower(t)
	if v, ok := m[l]; ok {
		return v
	}
	return ""
}

func toEmailLocal(name string) string {
	surnames := map[rune]string{
		'张': "zhang", '王': "wang", '李': "li", '赵': "zhao", '刘': "liu",
		'陈': "chen", '杨': "yang", '黄': "huang", '吴': "wu", '周': "zhou",
		'徐': "xu", '孙': "sun", '马': "ma", '朱': "zhu", '胡': "hu",
		'郭': "guo", '何': "he", '高': "gao", '林': "lin", '罗': "luo",
		'郑': "zheng", '梁': "liang", '谢': "xie", '宋': "song", '唐': "tang",
	}
	n := strings.TrimSpace(name)
	ln := strings.ToLower(n)
	r, _ := utf8.DecodeRuneInString(ln)
	if v, ok := surnames[r]; ok {
		return v
	}
	buf := make([]rune, 0, len(ln))
	for _, ch := range ln {
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			buf = append(buf, ch)
		}
	}
	if len(buf) == 0 {
		return "teacher"
	}
	return string(buf)
}

func toPinyinName(name string) string {
	n := strings.TrimSpace(name)
	if n == "" {
		return "teacher"
	}
	// polyphonic & special surname handling
	surnameMap := map[rune]string{
		'曾': "zeng", '单': "shan", '重': "chong", '区': "ou", '仇': "qiu", '柏': "bai", '薄': "bo",
		'任': "ren", '沈': "shen", '闫': "yan", '乐': "yue", '覃': "qin",
		'漆': "qi", '查': "zha", '折': "zhe",
		'张': "zhang", '王': "wang", '李': "li", '赵': "zhao", '刘': "liu",
		'陈': "chen", '杨': "yang", '黄': "huang", '吴': "wu", '周': "zhou",
		'徐': "xu", '孙': "sun", '马': "ma", '朱': "zhu", '胡': "hu",
		'郭': "guo", '何': "he", '高': "gao", '林': "lin", '罗': "luo",
		'郑': "zheng", '梁': "liang", '谢': "xie", '宋': "song", '唐': "tang",
	}
	givenMap := map[rune]string{
		'一': "yi", '二': "er", '三': "san", '四': "si", '五': "wu", '六': "liu", '七': "qi", '八': "ba", '九': "jiu", '十': "shi",
		'伟': "wei", '强': "qiang", '刚': "gang", '杰': "jie", '明': "ming", '华': "hua", '芳': "fang", '军': "jun",
		'磊': "lei", '洋': "yang", '艳': "yan", '超': "chao", '勇': "yong", '兵': "bing", '玲': "ling", '丹': "dan", '倩': "qian",
		'娟': "juan", '静': "jing", '丽': "li", '萍': "ping", '婷': "ting", '霞': "xia",
		'玉': "yu", '秋': "qiu", '春': "chun", '夏': "xia", '冬': "dong",
		'雪': "xue", '月': "yue", '星': "xing",
		'佳': "jia", '美': "mei", '爱': "ai", '乐': "le",
		'俊': "jun", '博': "bo", '晓': "xiao", '鑫': "xin", '琳': "lin",
		'文': "wen", '斌': "bin", '达': "da", '宁': "ning", '康': "kang",
		'祥': "xiang", '远': "yuan", '平': "ping", '航': "hang", '荣': "rong",
		'建': "jian", '国': "guo", '志': "zhi", '洁': "jie", '颖': "ying", '宇': "yu",
	}
	ln := strings.ToLower(n)
	r, size := utf8.DecodeRuneInString(ln)
	out := make([]string, 0, len(ln))
	if size > 0 {
		if v, ok := surnameMap[r]; ok {
			out = append(out, v)
			ln = ln[size:]
		}
	}
	for _, ch := range ln {
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			out = append(out, string(ch))
			continue
		}
		if v, ok := givenMap[ch]; ok {
			out = append(out, v)
		}
	}
	if len(out) == 0 {
		return toEmailLocal(name)
	}
	return strings.Join(out, "")
}

func isDigits(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}
