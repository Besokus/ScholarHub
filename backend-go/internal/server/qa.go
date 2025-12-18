package server

import (
	"encoding/json"
	"net/http"
	"scholarhub/backend-go/internal/models"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type QAController struct{ db *gorm.DB }

func NewQAController(db *gorm.DB) *QAController { return &QAController{db: db} }

func (q *QAController) List(c *gin.Context) {
	sort := c.Query("sort")
	status := c.Query("status")
	my := c.Query("my")
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if pageSize < 1 {
		pageSize = 15
	}
	uid := c.GetString("user_id")
	var list []models.Question
	tx := q.db
	if status == "unanswered" {
		tx = tx.Where("status = ?", "UNANSWERED")
	}
	if my == "1" && uid != "" {
		tx = tx.Where("\"studentId\" = ?", uid)
	}
	if sort == "hot" {
		tx = tx.Order("hot desc")
	} else {
		tx = tx.Order("\"createTime\" desc")
	}
	var total int64
	tx.Model(&models.Question{}).Count(&total)
	tx.Limit(pageSize).Offset((page - 1) * pageSize).Find(&list)
	c.JSON(http.StatusOK, respOk(gin.H{"items": list, "total": total}))
}

func (q *QAController) Detail(c *gin.Context) {
	id := c.Param("id")
	var item models.Question
	if err := q.db.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, respErr(1006, "not_found"))
		return
	}
	c.JSON(http.StatusOK, respOk(item))
}

func (q *QAController) Create(c *gin.Context) {
	uid := c.GetString("user_id")
	var req struct {
		CourseID    int
		Title       string
		ContentHTML string
		Images      []string
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}
	images := toJSONB(req.Images)
	item := models.Question{CourseID: req.CourseID, Title: req.Title, Content: "", ContentHTML: &req.ContentHTML, StudentID: uid}
	item.Images = images
	if err := q.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}
	c.JSON(http.StatusOK, respOk(item))
}

func toJSONB(arr []string) []byte {
	if len(arr) == 0 {
		return []byte("[]")
	}
	bytes, err := json.Marshal(arr)
	if err != nil {
		return []byte("[]")
	}
	return bytes
}
