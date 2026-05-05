// ============================================================
// VALIDASI NIK — harus tepat 16 digit angka
// ============================================================
document.addEventListener("DOMContentLoaded", function () {

    // Real-time NIK validation
    const nikInput = document.querySelector("input[placeholder='16 digit NIK']");
    if (nikInput) {
        nikInput.setAttribute("maxlength", "16");
        nikInput.setAttribute("pattern", "[0-9]{16}");
        nikInput.setAttribute("inputmode", "numeric");

        nikInput.addEventListener("input", function () {
            // Hapus karakter bukan angka
            this.value = this.value.replace(/\D/g, "");

            const len = this.value.length;
            if (len === 0) {
                this.style.boxShadow = "";
                this.style.borderColor = "";
                removeNikHint(this);
            } else if (len < 16) {
                this.style.boxShadow = "0 0 8px orange";
                this.style.borderColor = "orange";
                showNikHint(this, `Kurang ${16 - len} digit lagi`);
            } else {
                this.style.boxShadow = "0 0 8px lime";
                this.style.borderColor = "lime";
                removeNikHint(this);
            }
        });
    }

    // ============================================================
    // MAPS — OpenStreetMap + Geolocation API
    // ============================================================
    const addressFields = document.querySelectorAll("textarea[required]");
    addressFields.forEach(field => {
        // Cek apakah ini field alamat
        const label = field.closest(".field")?.querySelector("label");
        if (label && label.textContent.toLowerCase().includes("alamat")) {
            addMapsButton(field);
        }
    });

    // File upload preview
    document.querySelectorAll(".file-upload input[type='file']").forEach(inp => {
        inp.addEventListener("change", function () {
            const fn = this.closest(".file-upload").querySelector(".file-name");
            if (fn) {
                fn.textContent = this.files[0] ? this.files[0].name : "";
                fn.style.display = this.files[0] ? "block" : "none";
            }
        });
    });
});

// ===== NIK HINT =====
function showNikHint(input, msg) {
    let hint = input.parentElement.querySelector(".nik-hint");
    if (!hint) {
        hint = document.createElement("div");
        hint.className = "nik-hint";
        hint.style.cssText = "font-size:12px;color:orange;margin-top:4px;";
        input.parentElement.appendChild(hint);
    }
    hint.textContent = msg;
}

function removeNikHint(input) {
    const hint = input.parentElement.querySelector(".nik-hint");
    if (hint) hint.remove();
}

// ===== MAPS BUTTON =====
function addMapsButton(textarea) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
        </svg>
        Deteksi Lokasi Otomatis
    `;
    btn.style.cssText = `
        margin-top: 8px;
        padding: 8px 14px;
        background: #1e3a5f;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: 0.3s;
    `;

    btn.addEventListener("mouseenter", () => btn.style.background = "#2a5298");
    btn.addEventListener("mouseleave", () => btn.style.background = "#1e3a5f");

    btn.addEventListener("click", () => detectLocation(textarea, btn));
    textarea.parentElement.insertBefore(btn, textarea.nextSibling);
}

// ===== DETEKSI LOKASI =====
function detectLocation(textarea, btn) {
    if (!navigator.geolocation) {
        showToast("⚠️ Browser tidak support geolocation");
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Mendeteksi lokasi...";
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=id`,
                    { headers: { "Accept-Language": "id" } }
                );
                const data = await res.json();

                const addr = data.address;
                const parts = [
                    addr.road || addr.pedestrian || "",
                    addr.village || addr.suburb || "",
                    addr.city_district || addr.county || "",
                    addr.city || addr.town || addr.state_district || "",
                    addr.state || "",
                    addr.postcode || ""
                ].filter(Boolean);

                textarea.value = parts.join(", ");
                textarea.style.boxShadow = "0 0 8px lime";
                showToast("✅ Lokasi berhasil dideteksi!");
            } catch {
                showToast("⚠️ Gagal mengambil data alamat");
            }

            btn.innerHTML = originalText;
            btn.disabled = false;
        },
        (err) => {
            showToast("❌ Izin lokasi ditolak atau error");
            btn.innerHTML = originalText;
            btn.disabled = false;
        },
        { timeout: 10000 }
    );
}

// ============================================================
// SUBMIT FORM — dengan cek duplikat ke backend Golang
// ============================================================
async function submitForm(e) {
    e.preventDefault();
    const form = e.target;
    let valid = true;

    // Validasi NIK 16 digit
    const nikInput = form.querySelector("input[placeholder='16 digit NIK']");
    if (nikInput) {
        const nik = nikInput.value.trim();
        if (!/^\d{16}$/.test(nik)) {
            valid = false;
            nikInput.style.boxShadow = "0 0 8px red";
            showToast("❌ NIK harus tepat 16 digit angka!");
            return;
        }
    }

    // Validasi input biasa
    form.querySelectorAll("input[required], textarea[required], select[required]").forEach(field => {
        if (field.type === "radio" || field.type === "file") return;
        if (field.value.trim() === "") {
            valid = false;
            field.style.boxShadow = "0 0 8px red";
        } else {
            field.style.boxShadow = "0 0 8px lime";
        }
    });

    // Validasi file
    form.querySelectorAll("input[type='file'][required]").forEach(field => {
        if (!field.files || field.files.length === 0) {
            valid = false;
            field.closest(".file-upload").style.borderColor = "red";
        } else {
            field.closest(".file-upload").style.borderColor = "";
        }
    });

    // Validasi radio otomatis
    const radioGroups = new Set();
    form.querySelectorAll("input[type='radio'][required]").forEach(r => radioGroups.add(r.name));
    radioGroups.forEach(name => {
        const checked = form.querySelector(`input[name="${name}"]:checked`);
        if (!checked) {
            valid = false;
            form.querySelectorAll(`input[name="${name}"]`).forEach(r => {
                r.closest(".radio-item").style.outline = "2px solid red";
            });
        } else {
            form.querySelectorAll(`input[name="${name}"]`).forEach(r => {
                r.closest(".radio-item").style.outline = "";
            });
        }
    });

    if (!valid) {
        showToast("⚠️ Isi semua data yang wajib dulu!");
        return;
    }

    // ===== CEK DUPLIKAT KE BACKEND GOLANG =====
    const emailInput = form.querySelector("input[type='email']");
    const email = emailInput ? emailInput.value.trim() : null;
    const nik = nikInput ? nikInput.value.trim() : null;

    try {
        showToast("⏳ Memeriksa data...");

        const checkRes = await fetch("/api/check-duplicate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nik, email })
        });

        const checkData = await checkRes.json();

        if (checkData.duplicate) {
            if (checkData.field === "nik") {
                showToast("❌ NIK sudah terdaftar!");
                if (nikInput) nikInput.style.boxShadow = "0 0 8px red";
            } else if (checkData.field === "email") {
                showToast("❌ Email sudah terdaftar!");
                if (emailInput) emailInput.style.boxShadow = "0 0 8px red";
            }
            return;
        }
    } catch {
        showToast("⚠️ Gagal koneksi ke server");
        return;
    }

    // ===== KIRIM DATA KE BACKEND =====
    try {
        const formData = new FormData(form);
        const submitRes = await fetch("/api/submit-form", {
            method: "POST",
            body: formData
        });

        const submitData = await submitRes.json();

        if (submitData.success) {
            showToast("✅ Formulir berhasil dikirim!");
            setTimeout(() => {
                form.reset();
                form.querySelectorAll("input, textarea, select").forEach(f => f.style.boxShadow = "");
                form.querySelectorAll(".radio-item").forEach(r => r.style.outline = "");
                form.querySelectorAll(".file-name").forEach(fn => {
                    fn.textContent = "";
                    fn.style.display = "none";
                });
            }, 3200);
        } else {
            showToast("❌ Gagal kirim: " + (submitData.message || "Error"));
        }
    } catch {
        showToast("⚠️ Gagal mengirim formulir");
    }
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}