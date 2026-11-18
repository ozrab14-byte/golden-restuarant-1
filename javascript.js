(() => {
    "use strict";

    // کلیدهای ذخیره‌سازی محلی و قالب نمایش قیمت‌ها.
    const STORAGE_KEYS = {
        cart: "golden-table-cart",
        theme: "golden-table-theme"
    };
    const currency = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    });

    // ارجاع به بخش‌ها و کنترل‌های HTML برای استفاده در توابع پایین‌تر.
    const elements = {
        menu: document.querySelector("#menu-items"),
        search: document.querySelector("#menu-search"),
        filters: document.querySelector(".category-filters"),
        emptyMenu: document.querySelector(".empty-menu-message"),
        cartButton: document.querySelector(".cart-button"),
        cartCount: document.querySelector(".cart-count"),
        cartDialog: document.querySelector("#cart-dialog"),
        cartItems: document.querySelector("#cart-items"),
        cartSubtotal: document.querySelector("#cart-subtotal"),
        closeCart: document.querySelector(".close-dialog"),
        checkoutButton: document.querySelector(".checkout-button"),
        themeButton: document.querySelector(".theme-toggle"),
        menuButton: document.querySelector(".menu-toggle"),
        navigation: document.querySelector("#primary-navigation"),
        form: document.querySelector("#contact-form"),
        formFeedback: document.querySelector("#form-feedback"),
        whatsappLink: document.querySelector(".whatsapp-link"),
        year: document.querySelector("#current-year")
    };

    // وضعیت فیلتر فعال و محتوای اولیه سبد خرید.
    let activeCategory = "all";
    let cart = loadCart();

    // خواندن و نوشتن امن داده‌ها؛ در صورت محدودیت مرورگر، خطا در کنسول ثبت می‌شود.
    function readStorage(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            console.warn(`Could not read ${key} from local storage.`, error);
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (error) {
            console.warn(`Could not save ${key} to local storage.`, error);
        }
    }

    function loadCart() {
        const savedCart = readStorage(STORAGE_KEYS.cart);
        if (!savedCart) return [];

        try {
            const parsedCart = JSON.parse(savedCart);
            if (!Array.isArray(parsedCart)) throw new TypeError("Saved cart must be an array.");

            return parsedCart.filter((item) =>
                item &&
                typeof item.name === "string" &&
                item.name.trim() &&
                Number.isFinite(item.price) &&
                item.price > 0 &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0
            );
        } catch (error) {
            console.warn("The saved cart could not be restored; starting with an empty cart.", error);
            return [];
        }
    }

    function saveCart() {
        writeStorage(STORAGE_KEYS.cart, JSON.stringify(cart));
    }

    // محاسبه تعداد آیتم‌ها و مبلغ کل سفارش.
    function getCartCount() {
        return cart.reduce((total, item) => total + item.quantity, 0);
    }

    function getCartTotal() {
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
    }

    // ساخت سطر سبد خرید با دکمه‌های افزایش و کاهش تعداد.
    function createCartLine(item, index) {
        const row = document.createElement("div");
        row.className = "cart-line";
        row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.8rem 0;border-bottom:1px solid var(--color-line)";

        const details = document.createElement("div");
        details.style.cssText = "min-width:0;flex:1";

        const name = document.createElement("p");
        name.textContent = item.name;
        name.style.cssText = "margin:0;color:var(--color-ink);font-weight:650";

        const price = document.createElement("p");
        price.textContent = `${currency.format(item.price)} each`;
        price.style.cssText = "margin:.15rem 0 0;color:var(--color-muted);font-size:.82rem";

        const controls = document.createElement("div");
        controls.style.cssText = "display:flex;align-items:center;gap:.45rem;flex-shrink:0";

        const decrease = document.createElement("button");
        decrease.className = "icon-button";
        decrease.type = "button";
        decrease.textContent = "−";
        decrease.setAttribute("aria-label", `Remove one ${item.name}`);
        decrease.dataset.cartAction = "decrease";
        decrease.dataset.cartIndex = String(index);

        const quantity = document.createElement("span");
        quantity.textContent = String(item.quantity);
        quantity.setAttribute("aria-label", `Quantity: ${item.quantity}`);

        const increase = document.createElement("button");
        increase.className = "icon-button";
        increase.type = "button";
        increase.textContent = "+";
        increase.setAttribute("aria-label", `Add one ${item.name}`);
        increase.dataset.cartAction = "increase";
        increase.dataset.cartIndex = String(index);

        controls.append(decrease, quantity, increase);
        details.append(name, price);
        row.append(details, controls);
        return row;
    }

    // آماده‌سازی متن سفارش برای پیوند واتس‌اپ.
    function buildWhatsAppUrl() {
        const phone = "12125550148";
        const lines = cart.map((item) =>
            `${item.quantity} × ${item.name} — ${currency.format(item.price * item.quantity)}`
        );
        lines.push(`Total: ${currency.format(getCartTotal())}`);
        return `https://wa.me/${phone}?text=${encodeURIComponent(`Hello Golden Table, I'd like to place an order:\n${lines.join("\n")}`)}`;
    }

    // به‌روزرسانی نمای سبد، جمع قیمت و شمارنده پس از هر تغییر.
    function renderCart() {
        const count = getCartCount();
        elements.cartCount.textContent = String(count);
        elements.cartCount.setAttribute("aria-label", `${count} ${count === 1 ? "item" : "items"} in cart`);
        elements.cartItems.replaceChildren();

        if (cart.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "empty-cart-message";
            emptyMessage.textContent = "Your basket is waiting for something delicious.";
            elements.cartItems.append(emptyMessage);
        } else {
            cart.forEach((item, index) => {
                elements.cartItems.append(createCartLine(item, index));
            });
        }

        elements.cartSubtotal.textContent = currency.format(getCartTotal());
        elements.checkoutButton.disabled = cart.length === 0;
        if (elements.whatsappLink) elements.whatsappLink.href = buildWhatsAppUrl();
    }

    // افزودن غذای انتخاب‌شده به سفارش پس از بررسی نام و قیمت.
    function addToCart(button) {
        const name = button.dataset.item && button.dataset.item.trim();
        const price = Number(button.dataset.price);
        if (!name || !Number.isFinite(price) || price <= 0) {
            console.error("A menu item has invalid order details.", button);
            return;
        }

        const existingItem = cart.find((item) => item.name === name && item.price === price);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ name, price, quantity: 1 });
        }

        saveCart();
        renderCart();
        button.setAttribute("aria-label", `${name} added to your order`);
        window.setTimeout(() => button.removeAttribute("aria-label"), 1400);
    }

    // ترکیب عبارت جست‌وجو و دسته‌بندی برای فیلتر غذاها.
    function filterMenu() {
        if (!elements.menu) return;
        const query = elements.search ? elements.search.value.trim().toLocaleLowerCase() : "";
        let visibleCount = 0;

        elements.menu.querySelectorAll(".menu-card").forEach((card) => {
            const categoryMatches = activeCategory === "all" || card.dataset.category === activeCategory;
            const searchableText = `${card.dataset.search || ""} ${card.textContent}`.toLocaleLowerCase();
            const searchMatches = !query || searchableText.includes(query);
            const isVisible = categoryMatches && searchMatches;
            card.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        if (elements.emptyMenu) elements.emptyMenu.hidden = visibleCount > 0;
    }

    // بستن منوی موبایل و بازگرداندن وضعیت دسترس‌پذیری دکمه.
    function closeNavigation() {
        if (!elements.navigation || !elements.menuButton) return;
        elements.navigation.classList.remove("is-open");
        elements.menuButton.setAttribute("aria-expanded", "false");
        elements.menuButton.setAttribute("aria-label", "Open navigation menu");
    }

    // اعمال پوسته روشن یا تیره و ذخیره انتخاب کاربر.
    function setTheme(theme) {
        const isDark = theme === "dark";
        document.body.dataset.theme = isDark ? "dark" : "light";
        if (elements.themeButton) {
            elements.themeButton.setAttribute("aria-pressed", String(isDark));
            elements.themeButton.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
            const icon = elements.themeButton.querySelector("[aria-hidden='true']");
            if (icon) icon.textContent = isDark ? "☀" : "◐";
        }
        writeStorage(STORAGE_KEYS.theme, isDark ? "dark" : "light");
    }

    // بازیابی پوسته ذخیره‌شده یا استفاده از تنظیمات دستگاه.
    function initializeTheme() {
        const savedTheme = readStorage(STORAGE_KEYS.theme);
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(savedTheme === "dark" || (savedTheme !== "light" && prefersDark) ? "dark" : "light");
    }

    // باز و بسته کردن پنجره سبد با پشتیبانی از مرورگرهای قدیمی‌تر.
    function showCart() {
        if (!elements.cartDialog) return;
        if (typeof elements.cartDialog.showModal === "function") {
            if (!elements.cartDialog.open) elements.cartDialog.showModal();
        } else {
            elements.cartDialog.setAttribute("open", "");
        }
    }

    function hideCart() {
        if (!elements.cartDialog) return;
        if (typeof elements.cartDialog.close === "function") {
            if (elements.cartDialog.open) elements.cartDialog.close();
        } else {
            elements.cartDialog.removeAttribute("open");
        }
    }

    // اعتبارسنجی فرم و نمایش نتیجه بدون ادعای ارسال به سرور.
    function submitContactForm(event) {
        event.preventDefault();
        if (!elements.form || !elements.formFeedback) return;

        if (!elements.form.checkValidity()) {
            elements.form.reportValidity();
            elements.formFeedback.textContent = "Please complete each field with a valid name, email, and message.";
            return;
        }

        const guestName = elements.form.elements.namedItem("name").value.trim();
        elements.formFeedback.textContent = `Thank you, ${guestName}. Your message is ready; please email hello@goldentable.example or call us to complete your enquiry.`;
        elements.form.reset();
    }

    // رویدادهای منو و افزودن غذا؛ استفاده از واگذاری رویداد برای کارت‌های پویا.
    if (elements.menu) {
        elements.menu.addEventListener("click", (event) => {
            const button = event.target.closest(".add-to-cart-button");
            if (button && elements.menu.contains(button)) addToCart(button);
        });
    }

    if (elements.search) elements.search.addEventListener("input", filterMenu);

    // انتخاب دسته‌بندی و همگام‌سازی فیلترهای صفحه‌خوان.
    if (elements.filters) {
        elements.filters.addEventListener("click", (event) => {
            const button = event.target.closest(".filter-button");
            if (!button || !elements.filters.contains(button)) return;

            activeCategory = button.dataset.category || "all";
            elements.filters.querySelectorAll(".filter-button").forEach((filterButton) => {
                const isActive = filterButton === button;
                filterButton.classList.toggle("is-active", isActive);
                filterButton.setAttribute("aria-pressed", String(isActive));
            });
            filterMenu();
        });
    }

    // کنترل پنجره سبد، مدیریت تعدادها و رفتن به مرحله سفارش واتس‌اپ.
    if (elements.cartButton) elements.cartButton.addEventListener("click", showCart);
    if (elements.closeCart) elements.closeCart.addEventListener("click", hideCart);
    if (elements.cartDialog) {
        elements.cartDialog.addEventListener("click", (event) => {
            if (event.target === elements.cartDialog) hideCart();
        });
        elements.cartDialog.addEventListener("click", (event) => {
            const button = event.target.closest("[data-cart-action]");
            if (!button) return;
            const index = Number(button.dataset.cartIndex);
            const item = cart[index];
            if (!item) return;

            if (button.dataset.cartAction === "increase") item.quantity += 1;
            if (button.dataset.cartAction === "decrease") {
                item.quantity -= 1;
                if (item.quantity <= 0) cart.splice(index, 1);
            }
            saveCart();
            renderCart();
        });
    }

    if (elements.checkoutButton) {
        elements.checkoutButton.addEventListener("click", () => {
            if (!cart.length) return;
            const orderWindow = window.open(buildWhatsAppUrl(), "_blank");
            if (orderWindow) orderWindow.opener = null;
        });
    }

    // تغییر پوسته با حفظ انتخاب کاربر برای بازدید بعدی.
    if (elements.themeButton) {
        elements.themeButton.addEventListener("click", () => {
            setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
        });
    }

    // منوی موبایل با امکان بستن از راه پیوند، کلیک بیرون و کلید Escape.
    if (elements.menuButton && elements.navigation) {
        elements.menuButton.addEventListener("click", () => {
            const isOpen = elements.menuButton.getAttribute("aria-expanded") === "true";
            elements.navigation.classList.toggle("is-open", !isOpen);
            elements.menuButton.setAttribute("aria-expanded", String(!isOpen));
            elements.menuButton.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
        });

        elements.navigation.addEventListener("click", (event) => {
            if (event.target.closest("a")) closeNavigation();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeNavigation();
        });

        document.addEventListener("click", (event) => {
            if (!elements.navigation.contains(event.target) && !elements.menuButton.contains(event.target)) {
                closeNavigation();
            }
        });
    }

    // پاک کردن پیام اعتبارسنجی هنگام ویرایش و ثبت سال جاری در پابرگ.
    if (elements.form) elements.form.addEventListener("submit", submitContactForm);
    if (elements.form && elements.formFeedback) {
        elements.form.addEventListener("input", () => {
            elements.formFeedback.textContent = "";
        });
    }

    if (elements.year) elements.year.textContent = String(new Date().getFullYear());

    // راه‌اندازی صفحه با داده‌های ذخیره‌شده و نمایش منوی اولیه.
    initializeTheme();
    renderCart();
    filterMenu();
})();