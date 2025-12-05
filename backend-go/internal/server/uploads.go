package server

import (
    "net/http"
    "os"
    "path/filepath"
    "time"
    "github.com/gin-gonic/gin"
)

type UploadsController struct{}

func NewUploadsController() *UploadsController { return &UploadsController{} }

func (u *UploadsController) File(c *gin.Context) {
    f, err := c.FormFile("file")
    if err != nil { c.JSON(http.StatusBadRequest, respErr(1002, "bad_request")); return }
    dir := os.Getenv("UPLOAD_DIR"); if dir == "" { dir = "uploads" }
    name := time.Now().Format("20060102150405") + "-" + filepath.Base(f.Filename)
    path := filepath.Join(dir, name)
    if err := c.SaveUploadedFile(f, path); err != nil { c.JSON(http.StatusInternalServerError, respErr(1004, "save_error")); return }
    c.JSON(http.StatusOK, respOk(gin.H{"url": "/uploads/" + name, "size": f.Size, "type": f.Header.Get("Content-Type")}))
}

func (u *UploadsController) Images(c *gin.Context) {
    form, err := c.MultipartForm()
    if err != nil { c.JSON(http.StatusBadRequest, respErr(1002, "bad_request")); return }
    files := form.File["images"]
    dir := os.Getenv("UPLOAD_DIR"); if dir == "" { dir = "uploads" }
    urls := make([]gin.H, 0)
    for _, f := range files {
        name := time.Now().Format("20060102150405") + "-" + filepath.Base(f.Filename)
        path := filepath.Join(dir, name)
        if err := c.SaveUploadedFile(f, path); err != nil { continue }
        urls = append(urls, gin.H{"url": "/uploads/" + name, "size": f.Size})
    }
    c.JSON(http.StatusOK, respOk(gin.H{"urls": urls}))
}

