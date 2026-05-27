erDiagram
    direction LR

    users {
        int id PK
        varchar name
        varchar email
        varchar password
        varchar role
        varchar avatar_path
    }

    students {
        int id PK
        int user_id FK
        varchar nim
        varchar name
        varchar photo_path
    }

    lecturers {
        int id PK
        int user_id FK
        varchar nip
        varchar name
    }

    courses {
        int id PK
        varchar code
        varchar name
        int lecturer_id FK
        int credits
    }

    schedules {
        int id PK
        int course_id FK
        varchar day
        time start_time
        time end_time
        varchar room
    }

    enrollments {
        int id PK
        int student_id FK
        int course_id FK
        timestamp enrolled_at
    }

    schedule_overrides {
        int id PK
        int schedule_id FK
        date original_date
        date replacement_date
        time new_start_time
        time new_end_time
        varchar new_room
        varchar reason
        int created_by_user_id FK
    }

    attendance_sessions {
        int id PK
        int schedule_id FK
        int opened_by_user_id FK
        timestamp started_at
        timestamp ended_at
        varchar status
    }

    attendances {
        int id PK
        int student_id FK
        int schedule_id FK
        int session_id FK
        timestamp check_in_time
        varchar status
    }

    users ||--o| students : "1 user = 1 mahasiswa"
    users ||--o| lecturers : "1 user = 1 dosen"
    lecturers ||--o{ courses : "mengampu"
    courses ||--o{ schedules : "memiliki jadwal"
    courses ||--o{ enrollments : "diikuti"
    students ||--o{ enrollments : "mendaftar"
    schedules ||--o{ schedule_overrides : "diganti"
    schedules ||--o{ attendance_sessions : "membuka sesi"
    schedules ||--o{ attendances : "tercatat di"
    attendance_sessions ||--o{ attendances : "berisi"
    students ||--o{ attendances : "hadir"
