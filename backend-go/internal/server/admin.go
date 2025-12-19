package server

import (
	"encoding/json"
	"net/http"
	"scholarhub/backend-go/internal/models"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AdminController struct {
	db *gorm.DB
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
	a.db.Model(&models.User{}).Where("role = ?", "STUDENT").Count(&students)
	a.db.Model(&models.User{}).Where("role = ?", "TEACHER").Count(&teachers)
	a.db.Model(&models.Resource{}).Count(&resources)
	a.db.Model(&models.Question{}).Count(&questions)
	c.JSON(http.StatusOK, respOk(gin.H{
		"students":  students,
		"teachers":  teachers,
		"resources": resources,
		"questions": questions,
	}))
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
	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, respErr(1002, "username_password_required"))
		return
	}

	// Check duplicates
	var exist models.User
	if err := a.db.Where("username = ? OR \"employeeId\" = ?", req.Username, req.EmployeeID).First(&exist).Error; err == nil {
		c.JSON(http.StatusConflict, respErr(1003, "exists"))
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	u := models.User{
		Username:   req.Username,
		Password:   string(hash),
		FullName:   &req.FullName,
		Role:       "TEACHER",
		Email:      req.Username + "@teacher.local", // Default email if not provided
		Title:      &req.Title,
		EmployeeID: &req.EmployeeID,
	}

	if err := a.db.Create(&u).Error; err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}

	adminID := c.GetString("user_id")
	a.logAction(adminID, "CREATE_TEACHER", u.ID, req)

	c.JSON(http.StatusOK, respOk(u))
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
