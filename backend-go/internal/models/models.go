package models

import "time"

type User struct {
	// 加上 json 标签，前端才能拿到 id, username
	ID       string `gorm:"column:id;primaryKey" json:"id"`
	Username string `gorm:"column:username" json:"username"`
	// Password 加上 json:"-" 防止密码泄露给前端
	Password string  `gorm:"column:password" json:"-"`
	Role     string  `gorm:"column:role" json:"role"`
	Avatar   *string `gorm:"column:avatar" json:"avatar"`
	Email    string  `gorm:"column:email" json:"email"`
	Title    *string `gorm:"column:title" json:"title"`
}

func (User) TableName() string { return "\"User\"" } // 注意：Postgres带引号的表名需要转义

type Course struct {
	ID          int     `gorm:"column:id;primaryKey" json:"id"`
	Name        string  `gorm:"column:name" json:"name"`
	Description *string `gorm:"column:description" json:"description"`
	Department  string  `gorm:"column:department" json:"department"`
	TeacherID   string  `gorm:"column:teacherId" json:"teacherId"`
}

func (Course) TableName() string { return "\"Course\"" }

type Resource struct {
	ID          int     `gorm:"column:id;primaryKey" json:"id"`
	Title       string  `gorm:"column:title" json:"title"`
	Description *string `gorm:"column:description" json:"description"`
	FilePath    string  `gorm:"column:filePath" json:"filePath"`

	// 【修改 1】对应数据库 text 类型，Go 中用 string 接收
	UploaderID string `gorm:"column:uploaderId" json:"uploaderId"`
	Uploader   *User  `gorm:"foreignKey:UploaderID;references:ID" json:"uploader,omitempty"`

	CourseID      int       `gorm:"column:courseId" json:"courseId"`
	Course        *Course   `gorm:"foreignKey:CourseID;references:ID" json:"course,omitempty"`
	ViewType      string    `gorm:"column:viewType" json:"viewType"`
	DownloadCount int       `gorm:"column:downloadCount" json:"downloadCount"`
	ViewCount     int       `gorm:"column:viewcount;default:0" json:"viewCount"`
	CreateTime    time.Time `gorm:"column:createTime;autoCreateTime" json:"createTime"`

	// 【修改 3】增加 json 标签，否则前端传来的 size 和 type 无法存入
	Type *string `gorm:"column:fileType" json:"type"`
	Size *string `gorm:"column:fileSize" json:"size"`
}

func (Resource) TableName() string { return "\"Resource\"" }

type ResourceDownload struct {
	ID         string    `gorm:"column:id;primaryKey" json:"id"`
	ResourceID int       `gorm:"column:resourceId" json:"resourceId"`
	UserID     *string   `gorm:"column:userId" json:"userId"`
	CreateTime time.Time `gorm:"column:createTime;autoCreateTime" json:"createTime"`
}

func (ResourceDownload) TableName() string { return "\"ResourceDownload\"" }

type Question struct {
	ID          int       `gorm:"column:id;primaryKey" json:"id"`
	Title       string    `gorm:"column:title" json:"title"`
	Content     string    `gorm:"column:content" json:"content"`
	StudentID   string    `gorm:"column:studentId" json:"studentId"`
	CourseID    int       `gorm:"column:courseId" json:"courseId"`
	Status      string    `gorm:"column:status" json:"status"`
	CreateTime  time.Time `gorm:"column:createTime;autoCreateTime" json:"createTime"`
	ContentHTML *string   `gorm:"column:content_html" json:"contentHtml"`
	Images      []byte    `gorm:"column:images" json:"images"` // 注意：前端可能需要处理 []byte 转 base64 或 JSON
}

func (Question) TableName() string { return "\"Question\"" }

type Answer struct {
	ID          int       `gorm:"column:id;primaryKey" json:"id"`
	QuestionID  int       `gorm:"column:questionId" json:"questionId"`
	TeacherID   string    `gorm:"column:teacherId" json:"teacherId"`
	Content     string    `gorm:"column:content" json:"content"`
	Attachments *string   `gorm:"column:attachments" json:"attachments"`
	CreateTime  time.Time `gorm:"column:createTime;autoCreateTime" json:"createTime"`
}

func (Answer) TableName() string { return "\"Answer\"" }

type Notification struct {
	ID         int       `gorm:"column:id;primaryKey" json:"id"`
	Type       string    `gorm:"column:type" json:"type"`
	QuestionID *int      `gorm:"column:questionId" json:"questionId"`
	Title      string    `gorm:"column:title" json:"title"`
	UserID     string    `gorm:"column:userId" json:"userId"`
	Read       bool      `gorm:"column:read" json:"read"`
	CreateTime time.Time `gorm:"column:createTime;autoCreateTime" json:"createTime"`
}

func (Notification) TableName() string { return "\"Notification\"" }
