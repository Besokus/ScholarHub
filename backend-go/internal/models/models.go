package models

import "time"

type User struct {
	ID       int     `gorm:"column:id;primaryKey"`
	Username string  `gorm:"column:username"`
	Password string  `gorm:"column:password"`
	Role     string  `gorm:"column:role"`
	Avatar   *string `gorm:"column:avatar"`
	Email    string  `gorm:"column:email"`
	Title    *string `gorm:"column:title"`
}

func (User) TableName() string { return "User" }

type Course struct {
	ID          int     `gorm:"column:id;primaryKey"`
	Name        string  `gorm:"column:name"`
	Description *string `gorm:"column:description"`
	Department  string  `gorm:"column:department"`
	TeacherID   int     `gorm:"column:teacherId"`
}

func (Course) TableName() string { return "Course" }

type Resource struct {
	ID            int       `gorm:"column:id;primaryKey"`
	Title         string    `gorm:"column:title"`
	Description   *string   `gorm:"column:description"`
	FilePath      string    `gorm:"column:filePath"`
	UploaderID    int       `gorm:"column:uploaderId"`
	CourseID      int       `gorm:"column:courseId"`
	ViewType      string    `gorm:"column:viewType"`
	DownloadCount int       `gorm:"column:downloadCount"`
	CreateTime    time.Time `gorm:"column:createTime"`
	Type          *string   `gorm:"column:type"`
	Size          *string   `gorm:"column:size"`
}

func (Resource) TableName() string { return "Resource" }

type ResourceDownload struct {
	ID         string    `gorm:"column:id;primaryKey"`
	ResourceID int       `gorm:"column:resourceId"`
	UserID     *int      `gorm:"column:userId"`
	CreateTime time.Time `gorm:"column:createTime"`
}

func (ResourceDownload) TableName() string { return "ResourceDownload" }

type Question struct {
	ID          int       `gorm:"column:id;primaryKey"`
	Title       string    `gorm:"column:title"`
	Content     string    `gorm:"column:content"`
	StudentID   int       `gorm:"column:studentId"`
	CourseID    int       `gorm:"column:courseId"`
	Status      string    `gorm:"column:status"`
	CreateTime  time.Time `gorm:"column:createTime"`
	ContentHTML *string   `gorm:"column:content_html"`
	Images      []byte    `gorm:"column:images"`
}

func (Question) TableName() string { return "Question" }

type Answer struct {
	ID          int       `gorm:"column:id;primaryKey"`
	QuestionID  int       `gorm:"column:questionId"`
	TeacherID   int       `gorm:"column:teacherId"`
	Content     string    `gorm:"column:content"`
	Attachments *string   `gorm:"column:attachments"`
	CreateTime  time.Time `gorm:"column:createTime"`
}

func (Answer) TableName() string { return "Answer" }

type Notification struct {
	ID         string    `gorm:"column:id;primaryKey"`
	Type       string    `gorm:"column:type"`
	QuestionID *int      `gorm:"column:questionId"`
	Title      string    `gorm:"column:title"`
	UserID     int       `gorm:"column:userId"`
	Read       bool      `gorm:"column:read"`
	CreateTime time.Time `gorm:"column:createTime"`
}

func (Notification) TableName() string { return "Notification" }
