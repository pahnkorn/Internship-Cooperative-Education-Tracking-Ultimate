const userName = document.getElementById("userName");
const applyPanel = document.getElementById("applyPanel");
const applyForm = document.getElementById("applyForm");
const companySelect = document.getElementById("companySelect");
const formMessage = document.getElementById("formMessage");
const applicationTableBody = document.getElementById("applicationTableBody");

const statusText = {
    pending: "รอตรวจสอบ",
    approved: "อนุมัติ",
    rejected: "ไม่อนุมัติ"
};

let currentUser = null;

async function loadUser() {
    try {
        const response = await fetch("/api/me");
        currentUser = await response.json();
        const roleThai = currentUser.role === "student" ? "นักศึกษา" : "พี่เลี้ยง";
        userName.textContent = `${currentUser.username} (${roleThai})`;

        if (currentUser.role !== "student") {
            applyPanel.style.display = "none";
        }
    } catch (error) {
        userName.textContent = "";
    }
}

async function loadCompanyOptions() {
    try {
        const response = await fetch("/api/companies");
        const companies = await response.json();

        companies.forEach((company) => {
            const option = document.createElement("option");
            option.value = company.id;
            option.textContent = company.name;
            companySelect.appendChild(option);
        });
    } catch (error) {
        formMessage.textContent = "โหลดรายชื่อสถานประกอบการไม่สำเร็จ";
        formMessage.className = "form-message error";
    }
}

async function loadApplications() {
    try {
        const response = await fetch("/api/applications");
        const applications = await response.json();

        applicationTableBody.innerHTML = "";

        if (applications.length === 0) {
            applicationTableBody.innerHTML = '<tr><td colspan="5">ยังไม่มีใบสมัคร</td></tr>';
            return;
        }

        applications.forEach((application) => {
            const row = document.createElement("tr");

            const studentCell = document.createElement("td");
            studentCell.textContent = `${application.student_name} (${application.student_code})`;

            const companyCell = document.createElement("td");
            companyCell.textContent = application.company_name;

            const noteCell = document.createElement("td");
            noteCell.textContent = application.note || "-";

            const dateCell = document.createElement("td");
            dateCell.textContent = new Date(application.created_at).toLocaleDateString("th-TH");

            const statusCell = document.createElement("td");

            if (currentUser && currentUser.role === "mentor") {
                const select = document.createElement("select");
                select.className = "status-select";
                Object.keys(statusText).forEach((key) => {
                    const option = document.createElement("option");
                    option.value = key;
                    option.textContent = statusText[key];
                    if (key === application.status) option.selected = true;
                    select.appendChild(option);
                });
                select.addEventListener("change", () => changeStatus(application.id, select.value));
                statusCell.appendChild(select);
            } else {
                const badge = document.createElement("span");
                badge.className = `status-badge status-${application.status}`;
                badge.textContent = statusText[application.status] || application.status;
                statusCell.appendChild(badge);
            }

            row.appendChild(studentCell);
            row.appendChild(companyCell);
            row.appendChild(noteCell);
            row.appendChild(dateCell);
            row.appendChild(statusCell);
            applicationTableBody.appendChild(row);
        });
    } catch (error) {
        applicationTableBody.innerHTML = '<tr><td colspan="5">โหลดข้อมูลไม่สำเร็จ</td></tr>';
    }
}

applyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const body = {
        company_id: companySelect.value,
        note: document.getElementById("noteInput").value
    };

    try {
        const response = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await response.json();

        if (response.ok) {
            formMessage.textContent = data.message;
            formMessage.className = "form-message success";
            applyForm.reset();
            loadApplications();
        } else {
            formMessage.textContent = data.error;
            formMessage.className = "form-message error";
        }
    } catch (error) {
        formMessage.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้";
        formMessage.className = "form-message error";
    }
});

async function changeStatus(id, status) {
    const response = await fetch(`/api/applications/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
    });
    const data = await response.json();

    if (!response.ok) {
        alert(data.error);
        loadApplications();
    }
}

async function init() {
    await loadUser();
    loadCompanyOptions();
    loadApplications();
}

init();

