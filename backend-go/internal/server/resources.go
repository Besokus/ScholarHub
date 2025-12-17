package server

import (
	"net/http"
	"scholarhub/backend-go/internal/models"
	"strconv" // 必须引入
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ResourcesController struct{ db *gorm.DB }

func NewResourcesController(db *gorm.DB) *ResourcesController { return &ResourcesController{db: db} }

func (rc *ResourcesController) List(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	courseID := c.Query("courseId")
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("pageSize"))
	if pageSize < 1 {
		pageSize = 20
	}
	var list []models.Resource
	tx := rc.db
	if q != "" {
		tx = tx.Where("title ILIKE ?", "%"+q+"%")
	}
	if courseID != "" {
		tx = tx.Where("\"courseId\" = ?", courseID)
	}
	var total int64
	tx.Model(&models.Resource{}).Count(&total)
	tx.Order("\"downloadCount\" desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&list)
	c.JSON(http.StatusOK, respOk(gin.H{"items": list, "total": total}))
}

func (rc *ResourcesController) Detail(c *gin.Context) {
	id := c.Param("id")
	var r models.Resource

	// 增加 Preload("Uploader")，否则详情页没有上传者信息
	if err := rc.db.Preload("Uploader").First(&r, id).Error; err != nil {
		c.JSON(http.StatusNotFound, respErr(1006, "not_found"))
		return
	}

	// 增加浏览量 +1
	rc.db.Model(&r).Update("viewcount", r.ViewCount+1)
	r.ViewCount++ // 更新内存中的值以便返回最新数据

	c.JSON(http.StatusOK, respOk(r))
}

func (rc *ResourcesController) Create(c *gin.Context) {
	// 1. 获取用户ID并转为 string (因为数据库是 text)
	uidStr := c.GetString("user_id")

	// 2. 定义请求结构体 (必须有 json tag)
	var req struct {
		Title    string  `json:"title"`
		Summary  string  `json:"summary"`
		CourseID int     `json:"courseId"` // 必须接收 int
		Type     *string `json:"type"`
		Size     *string `json:"size"`
		FileURL  *string `json:"fileUrl"`
		ViewType *string `json:"viewType"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, respErr(1002, "bad_request"))
		return
	}

	fp := ""
	if req.FileURL != nil {
		fp = *req.FileURL
	}
	vt := "PUBLIC"
	if req.ViewType != nil {
		vt = *req.ViewType
	}

	// 3. 构建 Model
	r := models.Resource{
		Title:       req.Title,
		Description: &req.Summary,
		FilePath:    fp,
		UploaderID:  uidStr, // 赋值 string ID
		CourseID:    req.CourseID,
		ViewType:    vt,
		Type:        req.Type, // 现在可以正确存入了
		Size:        req.Size, // 现在可以正确存入了
	}

	// 必须执行 Create 才能写入数据库！
	if err := rc.db.Create(&r).Error; err != nil {
		// fmt.Println("DB Error:", err) // 调试用
		c.JSON(http.StatusInternalServerError, respErr(1004, "db_error"))
		return
	}
	c.JSON(http.StatusOK, respOk(r))
}

func (rc *ResourcesController) Download(c *gin.Context) {
	uid := c.GetString("user_id")
	id := c.Param("id")
	var r models.Resource
	if err := rc.db.First(&r, id).Error; err != nil {
		c.JSON(http.StatusNotFound, respErr(1006, "not_found"))
		return
	}
	rd := models.ResourceDownload{ResourceID: r.ID}
	if uid != "" {
		rd.UserID = &uid
	}
	rc.db.Create(&rd)
	rc.db.Model(&r).Update("downloadCount", r.DownloadCount+1)
	c.JSON(http.StatusOK, respOk(gin.H{"downloadCount": r.DownloadCount + 1}))
}

func (rc *ResourcesController) MyDownloads(c *gin.Context) {
	uid := c.GetString("user_id")
	var list []models.ResourceDownload
	rc.db.Where("\"userId\" = ?", uid).Order("\"createTime\" desc").Find(&list)
	c.JSON(http.StatusOK, respOk(gin.H{"items": list}))
}

func (rc *ResourcesController) MyUploads(c *gin.Context) {
	uid := c.GetString("user_id")
	var list []models.Resource
	rc.db.Where("\"uploaderId\" = ?", uid).Order("\"createTime\" desc").Find(&list)
	c.JSON(http.StatusOK, respOk(gin.H{"items": list}))
}
