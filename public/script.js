const databaseStatus = document.getElementById("databaseStatus");
const studentCount = document.getElementById("studentCount");
const applicationCount = document.getElementById("applicationCount");
const userName = document.getElementById("userName");
const studentTableBody = document.getElementById("studentTableBody");
const searchInput = document.getElementById("searchInput");
const studentForm = document.getElementById("studentForm");
const formMessage = document.getElementById("formMessage");

let currentUser = null;

async function loadUser() {
    try {
        const response = await fetch("/api/me");
        currentUser = await response.json();
        const roleThai = currentUser.role === "student" ? "นักศึกษา" : "พี่เลี้ยง";
        userName.textContent = `${currentUser.username} (${roleThai})`;

        if (currentUser.role !== "mentor") {
            document.getElementById("addStudentPanel").style.display = "none";
        }
    } catch (error) {
        userName.textContent = "";
    }
}

async function checkDatabase() {
    try {
        const response = await fetch("/api/status");
        const data = await response.json();
        databaseStatus.textContent =
            data.database === "connected" ? "เชื่อมต่อแล้ว" : "เชื่อมต่อไม่ได้";
    } catch (error) {
        databaseStatus.textContent = "เชื่อมต่อไม่ได้";
    }
}

async function loadStudentCount() {
    try {
        const response = await fetch("/api/students/count");
        const data = await response.json();
        studentCount.textContent = data.total;
    } catch (error) {
        studentCount.textContent = "-";
    }
}

async function loadApplicationCount() {
    try {
        const response = await fetch("/api/applications");
        const applications = await response.json();
        applicationCount.textContent = applications.length;
    } catch (error) {
        applicationCount.textContent = "-";
    }
}

async function loadStudents() {
    try {
        const keyword = searchInput.value.trim();
        const response = await fetch("/api/students?q=" + encodeURIComponent(keyword));
        const students = await response.json();

        studentTableBody.innerHTML = "";

        if (students.length === 0) {
            studentTableBody.innerHTML = '<tr><td colspan="4">ไม่พบนักศึกษา</td></tr>';
            return;
        }

        students.forEach((student) => {
            const row = document.createElement("tr");

            const codeCell = document.createElement("td");
            codeCell.textContent = student.student_code;

            const nameCell = document.createElement("td");
            const nameLink = document.createElement("a");
            nameLink.href = `student.html?id=${student.id}`;
            nameLink.textContent = student.full_name;
            nameLink.className = "name-link";
            nameCell.appendChild(nameLink);

            const majorCell = document.createElement("td");
            majorCell.textContent = student.major;

            row.appendChild(codeCell);
            row.appendChild(nameCell);
            row.appendChild(majorCell);

            if (currentUser && currentUser.role === "mentor") {
                const actionCell = document.createElement("td");
                actionCell.className = "actions";

                const editButton = document.createElement("button");
                editButton.textContent = "แก้ไข";
                editButton.className = "btn-small";
                editButton.addEventListener("click", () => editStudent(student));

                const deleteButton = document.createElement("button");
                deleteButton.textContent = "ลบ";
                deleteButton.className = "btn-small btn-danger";
                deleteButton.addEventListener("click", () => deleteStudent(student));

                actionCell.appendChild(editButton);
                actionCell.appendChild(deleteButton);
                row.appendChild(actionCell);
            }

            studentTableBody.appendChild(row);
        });
    } catch (error) {
        studentTableBody.innerHTML = '<tr><td colspan="4">โหลดข้อมูลไม่สำเร็จ</td></tr>';
    }
}

async function editStudent(student) {
    const student_code = prompt("รหัสนักศึกษา:", student.student_code);
    if (student_code === null) return;
    const full_name = prompt("ชื่อ-นามสกุล:", student.full_name);
    if (full_name === null) return;
    const major = prompt("สาขา:", student.major || "");
    if (major === null) return;

    const response = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_code, full_name, major })
    });
    const data = await response.json();

    if (response.ok) {
        loadStudents();
    } else {
        alert(data.error);
    }
}

async function deleteStudent(student) {
    if (!confirm(`ลบ ${student.full_name} ใช่หรือไม่?`)) return;

    const response = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
    const data = await response.json();

    if (response.ok) {
        loadStudents();
        loadStudentCount();
        loadApplicationCount();
    } else {
        alert(data.error);
    }
}

studentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const body = {
        student_code: document.getElementById("studentCodeInput").value,
        full_name: document.getElementById("fullNameInput").value,
        major: document.getElementById("majorInput").value
    };

    try {
        const response = await fetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await response.json();

        if (response.ok) {
            formMessage.textContent = data.message;
            formMessage.className = "form-message success";
            studentForm.reset();
            loadStudents();
            loadStudentCount();
        } else {
            formMessage.textContent = data.error;
            formMessage.className = "form-message error";
        }
    } catch (error) {
        formMessage.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้";
        formMessage.className = "form-message error";
    }
});

searchInput.addEventListener("input", loadStudents);

async function init() {
    await loadUser();
    checkDatabase();
    loadStudentCount();
    loadApplicationCount();
    loadStudents();
}

init();

