document.addEventListener("DOMContentLoaded", function () {
    let currentPath = window.location.pathname;
    let navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach((link) => {
        if (link.getAttribute("href") === currentPath) {
            // اگر لینک درون یک منوی dropdown قرار دارد
            let dropdownMenu = link.closest(".dropdown-menu");
            if (dropdownMenu) {
                let dropdownToggle = dropdownMenu.previousElementSibling;
                if (dropdownToggle && dropdownToggle.classList.contains("dropdown-toggle")) {
                    dropdownToggle.classList.add("active"); // اضافه کردن کلاس active به والد
                }
            }
            // اضافه کردن کلاس active به لینک انتخاب شده
            link.classList.add("active");
        }
    });
});
