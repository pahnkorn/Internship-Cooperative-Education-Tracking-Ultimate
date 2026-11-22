const userName = document.getElementById("userName");
const studentName = document.getElementById("studentName");
const detailCode = document.getElementById("detailCode");
const detailName = document.getElementById("detailName");
const detailMajor = document.getElementById("detailMajor");
const errorMessage = document.getElementById("errorMessage");

async function loadUser() {
    try {
        const response = await fetch("/api/me");
        const user = await response.json();
        const roleThai = user.role === "student" ? "นักศึกษา" : "พี่เลี้ยง";
        userName.textContent = `${user.username} (${roleThai})`;
    } catch (error) {
        userName.textContent = "";
    }
}

async function loadStudent() {
    const id = new URLSearchParams(location.search).get("id");

    try {
        const response = await fetch(`/api/students/${encodeURIComponent(id)}`);
        const data = await response.json();

        if (!response.ok) {
            studentName.textContent = "ไม่พบข้อมูล";
            errorMessage.textContent = data.error;
            return;
        }

        studentName.textContent = data.full_name;
        detailCode.textContent = data.student_code;
        detailName.textContent = data.full_name;
        detailMajor.textContent = data.major || "-";
    } catch (error) {
        studentName.textContent = "ไม่พบข้อมูล";
        errorMessage.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้";
    }
}

loadUser();
loadStudent();