const userName = document.getElementById("userName");
const companyTableBody = document.getElementById("companyTableBody");
const companyForm = document.getElementById("companyForm");
const formMessage = document.getElementById("formMessage");

let currentUser = null;

async function loadUser() {
    try {
        const response = await fetch("/api/me");
        currentUser = await response.json();
        const roleThai = currentUser.role === "student" ? "นักศึกษา" : "พี่เลี้ยง";
        userName.textContent = `${currentUser.username} (${roleThai})`;

        if (currentUser.role !== "mentor") {
            document.getElementById("addCompanyPanel").style.display = "none";
        }
    } catch (error) {
        userName.textContent = "";
    }
}

async function loadCompanies() {
    try {
        const response = await fetch("/api/companies");
        const companies = await response.json();

        companyTableBody.innerHTML = "";

        if (companies.length === 0) {
            companyTableBody.innerHTML = '<tr><td colspan="5">ยังไม่มีสถานประกอบการ</td></tr>';
            return;
        }

        companies.forEach((company) => {
            const row = document.createElement("tr");

            [company.name, company.address, company.contact_name, company.contact_phone].forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");
            actionCell.className = "actions";

            if (currentUser && currentUser.role === "mentor") {
                const editButton = document.createElement("button");
                editButton.textContent = "แก้ไข";
                editButton.className = "btn-small";
                editButton.addEventListener("click", () => editCompany(company));

                const deleteButton = document.createElement("button");
                deleteButton.textContent = "ลบ";
                deleteButton.className = "btn-small btn-danger";
                deleteButton.addEventListener("click", () => deleteCompany(company));

                actionCell.appendChild(editButton);
                actionCell.appendChild(deleteButton);
            }

            row.appendChild(actionCell);
            companyTableBody.appendChild(row);
        });
    } catch (error) {
        companyTableBody.innerHTML = '<tr><td colspan="5">โหลดข้อมูลไม่สำเร็จ</td></tr>';
    }
}

companyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const body = {
        name: document.getElementById("nameInput").value,
        address: document.getElementById("addressInput").value,
        contact_name: document.getElementById("contactNameInput").value,
        contact_phone: document.getElementById("contactPhoneInput").value
    };

    try {
        const response = await fetch("/api/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await response.json();

        if (response.ok) {
            formMessage.textContent = data.message;
            formMessage.className = "form-message success";
            companyForm.reset();
            loadCompanies();
        } else {
            formMessage.textContent = data.error;
            formMessage.className = "form-message error";
        }
    } catch (error) {
        formMessage.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้";
        formMessage.className = "form-message error";
    }
});

async function editCompany(company) {
    const name = prompt("ชื่อสถานประกอบการ:", company.name);
    if (name === null) return;
    const address = prompt("ที่อยู่:", company.address || "");
    if (address === null) return;
    const contact_name = prompt("ผู้ประสานงาน:", company.contact_name || "");
    if (contact_name === null) return;
    const contact_phone = prompt("เบอร์โทร:", company.contact_phone || "");
    if (contact_phone === null) return;

    const response = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, contact_name, contact_phone })
    });
    const data = await response.json();

    if (response.ok) {
        loadCompanies();
    } else {
        alert(data.error);
    }
}

async function deleteCompany(company) {
    if (!confirm(`ลบ ${company.name} ใช่หรือไม่?`)) return;

    const response = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
    const data = await response.json();

    if (response.ok) {
        loadCompanies();
    } else {
        alert(data.error);
    }
}

async function init() {
    await loadUser();
    loadCompanies();
}

init();


