const userName = document.getElementById("userName");
const reportPanel = document.getElementById("reportPanel");
const reportForm = document.getElementById("reportForm");
const formMessage = document.getElementById("formMessage");
const reportList = document.getElementById("reportList");

let currentUser = null;

async function loadUser() {
    try {
        const response = await fetch("/api/me");
        currentUser = await response.json();
        const roleThai = currentUser.role === "student" ? "นักศึกษา" : "พี่เลี้ยง";
        userName.textContent = `${currentUser.username} (${roleThai})`;

        if (currentUser.role !== "student") {
            reportPanel.style.display = "none";
        }
    } catch (error) {
        userName.textContent = "";
    }
}

async function loadReports() {
    try {
        const response = await fetch("/api/reports");
        const reports = await response.json();

        reportList.innerHTML = "";

        if (reports.length === 0) {
            reportList.textContent = "ยังไม่มีรายงาน";
            return;
        }

        reports.forEach((report) => {
            const card = document.createElement("article");
            card.className = "report-card";

            const title = document.createElement("h3");
            title.textContent = `สัปดาห์ที่ ${report.week_number} | ${report.student_name} (${report.student_code}) | ${report.company_name}`;

            const date = document.createElement("p");
            date.className = "report-date";
            date.textContent = new Date(report.created_at).toLocaleDateString("th-TH");

            const content = document.createElement("p");
            content.className = "report-content";
            content.textContent = report.content;

            const comment = document.createElement("p");
            comment.className = "report-comment";
            comment.textContent = report.mentor_comment
                ? `ความเห็นพี่เลี้ยง: ${report.mentor_comment}`
                : "ยังไม่มีความเห็นจากพี่เลี้ยง";

            card.appendChild(title);
            card.appendChild(date);
            card.appendChild(content);
            card.appendChild(comment);

            if (currentUser && currentUser.role === "mentor") {
                const button = document.createElement("button");
                button.textContent = report.mentor_comment ? "แก้ไขความเห็น" : "เขียนความเห็น";
                button.className = "btn-small";
                button.addEventListener("click", () => writeComment(report));
                card.appendChild(button);
            }

            reportList.appendChild(card);
        });
    } catch (error) {
        reportList.textContent = "โหลดข้อมูลไม่สำเร็จ";
    }
}

reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const body = {
        week_number: document.getElementById("weekInput").value,
        content: document.getElementById("contentInput").value
    };

    try {
        const response = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await response.json();

        if (response.ok) {
            formMessage.textContent = data.message;
            formMessage.className = "form-message success";
            reportForm.reset();
            loadReports();
        } else {
            formMessage.textContent = data.error;
            formMessage.className = "form-message error";
        }
    } catch (error) {
        formMessage.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้";
        formMessage.className = "form-message error";
    }
});

async function writeComment(report) {
    const comment = prompt("ความเห็นถึงนักศึกษา:", report.mentor_comment || "");
    if (comment === null) return;

    const response = await fetch(`/api/reports/${report.id}/comment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
    });
    const data = await response.json();

    if (response.ok) {
        loadReports();
    } else {
        alert(data.error);
    }
}

async function init() {
    await loadUser();
    loadReports();
}

init();

