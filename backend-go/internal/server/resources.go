package server

import (
    "net/http"
    "strconv"
    "strings"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "scholarhub/backend-go/internal/models"
)

type ResourcesController struct{ db *gorm.DB }

func NewResourcesController(db *gorm.DB) *ResourcesController { return &ResourcesController{db: db} }

func (rc *ResourcesController) List(c *gin.Context) {
    q := strings.TrimSpace(c.Query("q"))
    courseID := c.Query("courseId")
    page, _ := strconv.Atoi(c.Query("page")); if page < 1 { page = 1 }
    pageSize, _ := strconv.Atoi(c.Query("pageSize")); if pageSize < 1 { pageSize = 20 }
    var list []models.Resource
    tx := rc.db
    if q != "" { tx = tx.Where("title ILIKE ?", "%"+q+"%") }
    if courseID != "" { tx = tx.Where("\"courseId\" = ?", courseID) }
    var total int64
    tx.Model(&models.Resource{}).Count(&total)
    tx.Order("\"downloadCount\" desc").Limit(pageSize).Offset((page-1)*pageSize).Find(&list)
    c.JSON(http.StatusOK, respOk(gin.H{"items": list, "total": total}))
}

func (rc *ResourcesController) Detail(c *gin.Context) {
    id := c.Param("id")
    var r models.Resource
    if err := rc.db.First(&r, id).Error; err != nil { c.JSON(http.StatusNotFound, respErr(1006, "not_found")); return }
    c.JSON(http.StatusOK, respOk(r))
}

func (rc *ResourcesController) Create(c *gin.Context) {
    uid := c.GetInt("user_id")
    var req struct{ Title string; Summary string; CourseID int; Type *string; Size *string; FileURL *string; ViewType *string }
    if err := c.ShouldBindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, respErr(1002, "bad_request")); return }
    fp := ""
    if req.FileURL != nil { fp = *req.FileURL }
    vt := "PUBLIC"
    if req.ViewType != nil { vt = *req.ViewType }
    r := models.Resource{Title: req.Title, Description: &req.Summary, FilePath: fp, UploaderID: uid, CourseID: req.CourseID, ViewType: vt, Type: req.Type, Size: req.Size}
    if err := rc.db.Create(&r).Error; err != nil { c.JSON(http.StatusInternalServerError, respErr(1004, "db_error")); return }
    c.JSON(http.StatusOK, respOk(r))
}

func (rc *ResourcesController) Download(c *gin.Context) {
    uid := c.GetInt("user_id")
    id := c.Param("id")
    var r models.Resource
    if err := rc.db.First(&r, id).Error; err != nil { c.JSON(http.StatusNotFound, respErr(1006, "not_found")); return }
    rd := models.ResourceDownload{ResourceID: r.ID}
    if uid != 0 { rd.UserID = &uid }
    rc.db.Create(&rd)
    rc.db.Model(&r).Update("downloadCount", r.DownloadCount+1)
    c.JSON(http.StatusOK, respOk(gin.H{"downloadCount": r.DownloadCount+1}))
}

func (rc *ResourcesController) MyDownloads(c *gin.Context) {
    uid := c.GetInt("user_id")
    var list []models.ResourceDownload
    rc.db.Where("\"userId\" = ?", uid).Order("\"createTime\" desc").Find(&list)
    c.JSON(http.StatusOK, respOk(gin.H{"items": list}))
}

func (rc *ResourcesController) MyUploads(c *gin.Context) {
    uid := c.GetInt("user_id")
    var list []models.Resource
    rc.db.Where("\"uploaderId\" = ?", uid).Order("\"createTime\" desc").Find(&list)
    c.JSON(http.StatusOK, respOk(gin.H{"items": list}))
}

