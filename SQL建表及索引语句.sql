CREATE TABLE "User" (
                        id        TEXT PRIMARY KEY,
                        username  TEXT NOT NULL UNIQUE,
                        fullName  TEXT,
                        password  TEXT NOT NULL,
                        role      TEXT NOT NULL DEFAULT 'STUDENT',
                        avatar    TEXT,
                        email     TEXT NOT NULL UNIQUE,
                        title     TEXT,
                        uploads   integer default 0,
                        downloads integer default 0
);

CREATE TABLE "Course" (
                          id          SERIAL PRIMARY KEY,
                          name        TEXT NOT NULL,
                          description TEXT,
                          department  TEXT NOT NULL,
                          "teacherId" TEXT NOT NULL REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_course_name ON "Course"(name);

CREATE TABLE "Question" (
                            id           SERIAL PRIMARY KEY,
                            title        TEXT NOT NULL,
                            content      TEXT NOT NULL,
                            "studentId"  TEXT NOT NULL REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                            "courseId"   INTEGER NOT NULL REFERENCES "Course"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                            status       TEXT NOT NULL DEFAULT 'UNANSWERED',
                            "createTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            images       TEXT,
                            content_html TEXT,
                            viewCount    integer default 0
);

CREATE TABLE "Answer" (
                          id           SERIAL PRIMARY KEY,
                          "questionId" INTEGER NOT NULL REFERENCES "Question"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                          "teacherId"  TEXT NOT NULL REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                          content      TEXT NOT NULL,
                          attachments  TEXT,
                          "createTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Resource" (
                            id              SERIAL PRIMARY KEY,
                            title           TEXT NOT NULL,
                            description     TEXT,
                            "filePath"      TEXT NOT NULL,
                            "uploaderId"    TEXT NOT NULL REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                            "courseId"      INTEGER NOT NULL REFERENCES "Course"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                            "viewType"      TEXT NOT NULL DEFAULT 'PUBLIC',
                            "downloadCount" INTEGER NOT NULL DEFAULT 0,
                            "createTime"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            viewCount       integer default 0,
                            type            TEXT,
                            size            TEXT
);

CREATE INDEX idx_resource_course ON "Resource" ("courseId");
CREATE INDEX idx_resource_download_count ON "Resource" ("downloadCount" DESC);

CREATE TABLE "Notification" (
                                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                type         TEXT NOT NULL,
                                "questionId" INTEGER REFERENCES "Question"(id) ON UPDATE CASCADE ON DELETE SET NULL,
                                title        TEXT NOT NULL,
                                "userId"     TEXT NOT NULL REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
                                read         BOOLEAN NOT NULL DEFAULT FALSE,
                                "createTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_user_time ON "Notification" ("userId", "createTime" DESC);

CREATE TABLE "ResourceDownload" (
                                    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                    "resourceId" INTEGER NOT NULL REFERENCES "Resource"(id) ON UPDATE CASCADE ON DELETE CASCADE,
                                    "userId"     TEXT REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
                                    "createTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_res_download_user_time ON "ResourceDownload" ("userId", "createTime" DESC);

DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Course' AND column_name='teacherId') THEN
            ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Resource' AND column_name='uploaderId') THEN
            ALTER TABLE "Resource" ADD CONSTRAINT "Resource_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Question' AND column_name='studentId') THEN
            ALTER TABLE "Question" ADD CONSTRAINT "Question_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Answer' AND column_name='teacherId') THEN
            ALTER TABLE "Answer" ADD CONSTRAINT "Answer_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Notification' AND column_name='userId') THEN
            ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ResourceDownload' AND column_name='userId') THEN
            ALTER TABLE "ResourceDownload" ADD CONSTRAINT "ResourceDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
    END $$;

DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Course' AND column_name='teacherId') THEN
            ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Resource' AND column_name='uploaderId') THEN
            ALTER TABLE "Resource" ADD CONSTRAINT "Resource_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Question' AND column_name='studentId') THEN
            ALTER TABLE "Question" ADD CONSTRAINT "Question_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Answer' AND column_name='teacherId') THEN
            ALTER TABLE "Answer" ADD CONSTRAINT "Answer_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Notification' AND column_name='userId') THEN
            ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ResourceDownload' AND column_name='userId') THEN
            ALTER TABLE "ResourceDownload" ADD CONSTRAINT "ResourceDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
    END $$;

ROLLBACK;

-- 分类表
create table "Category"
(
    id          serial
        primary key,
    name        text              not null,
    code        text              not null,
    "parentId"  integer
                                  references "Category"
                                      on update cascade on delete set null,
    "sortOrder" integer default 0 not null
);

alter table "Category"
    owner to "SQL_user";

create unique index "Category_code_key"
    on "Category" (code);

-- 课程分类表
create table "CourseCategory"
(
    id          serial
        primary key,
    name        text                                   not null,
    description text,
    "createdAt" timestamp(3) default CURRENT_TIMESTAMP not null
);

alter table "CourseCategory"
    owner to "SQL_user";

create index "CourseCategory_name_idx"
    on "CourseCategory" (name);

-- 健康指标样本表
create table "HealthSample"
(
    id            bigserial
        primary key,
    score         bigint,
    status        text,
    "cpuUsed"     numeric,
    "memUsed"     numeric,
    "diskUsed"    numeric,
    "dbLatencyMs" bigint,
    "endpointMs"  bigint,
    "createTime"  timestamp with time zone
);

alter table "HealthSample"
    owner to "SQL_user";