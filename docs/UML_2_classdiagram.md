classDiagram
    direction LR

    %% ── AUTHENTICATION LAYER ──────────────────────────────
    class User {
        <<entity>>
        +int id
        +String name
        +String email
        +String password
        +String role
        +String avatar_path
        +login(email, password) Token
        +updateProfile(name) void
        +changePassword(old, new) bool
        +uploadAvatar(file) String
    }

    %% ── ACADEMIC ENTITIES ─────────────────────────────────
    class Student {
        <<entity>>
        +int id
        +int user_id
        +String nim
        +String name
        +String photo_path
        +getAttendances() List
        +getEnrollments() List
    }

    class Lecturer {
        <<entity>>
        +int id
        +int user_id
        +String nip
        +String name
        +getCourses() List
    }

    class Course {
        <<entity>>
        +int id
        +String code
        +String name
        +int lecturer_id
        +int credits
        +getEnrolledStudents() List
        +getSchedules() List
    }

    class Schedule {
        <<entity>>
        +int id
        +int course_id
        +String day
        +Time start_time
        +Time end_time
        +String room
        +getActiveSessions() List
        +getNextDate() Date
    }

    class Enrollment {
        <<entity>>
        +int id
        +int student_id
        +int course_id
        +DateTime enrolled_at
    }

    class ScheduleOverride {
        <<entity>>
        +int id
        +int schedule_id
        +Date original_date
        +Date replacement_date
        +Time new_start_time
        +Time new_end_time
        +String new_room
        +String reason
    }

    %% ── ATTENDANCE LAYER ──────────────────────────────────
    class AttendanceSession {
        <<entity>>
        +int id
        +int schedule_id
        +int opened_by_user_id
        +DateTime started_at
        +DateTime ended_at
        +String status
        +open(schedule_id) AttendanceSession
        +close() void
        +isOpen() bool
    }

    class Attendance {
        <<entity>>
        +int id
        +int student_id
        +int schedule_id
        +int session_id
        +DateTime check_in_time
        +String status
    }

    %% ── SERVICE LAYER ─────────────────────────────────────
    class FaceRecognitionEngine {
        <<service>>
        +String model_name
        +float threshold
        +float match_margin
        +loadEmbeddings() dict
        +getEmbedding(image) List~float~
        +cosineSimilarity(a, b) float
        +buildCandidates(students, emb) List
        +recognize(image, candidates) tuple
    }

    class WebSocketHandler {
        <<controller>>
        +connect(token, session_id) void
        +receiveFrame(image_b64) void
        +processFrame(frame) dict
        +recordAttendance(student_id) void
        +disconnect() void
    }

    %% ── RELATIONSHIPS ─────────────────────────────────────
    User "1" --> "0..1" Student : has
    User "1" --> "0..1" Lecturer : has
    Lecturer "1" --> "0..*" Course : teaches
    Course "1" --> "0..*" Schedule : has
    Course "1" --> "0..*" Enrollment : has
    Student "1" --> "0..*" Enrollment : joins
    Schedule "1" --> "0..*" ScheduleOverride : overridden by
    Schedule "1" --> "0..*" AttendanceSession : opens
    AttendanceSession "1" --> "0..*" Attendance : records
    Student "1" --> "0..*" Attendance : has
    WebSocketHandler --> FaceRecognitionEngine : uses
    WebSocketHandler --> AttendanceSession : manages
