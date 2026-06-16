(function () {
  const PRODUCT = {
    name: "Signature Cream Puff Box",
    price: 155
  };
  const BUSINESS = {
    name: "Jinnamee's Patisserie",
    messengerUrl: "https://m.me/jinnameespatisserie",
    pickupMapUrl: "https://maps.app.goo.gl/FFJx3Umqaqbdw6dR8"
  };
  const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  });
  const REMEMBER_KEY = "jinnameesRememberedDetails";

  const state = {
    quantity: 1
  };

  const els = {
    header: document.querySelector("[data-header]"),
    form: document.querySelector("[data-order-form]"),
    minus: document.querySelector("[data-quantity-minus]"),
    plus: document.querySelector("[data-quantity-plus]"),
    quantity: document.querySelector("[data-quantity]"),
    subtotal: document.querySelector("[data-subtotal]"),
    summaryLabel: document.querySelector("[data-summary-label]"),
    summaryNote: document.querySelector("[data-summary-note]"),
    fulfillment: document.querySelector("[data-fulfillment]"),
    pickupLocation: document.querySelector("[data-pickup-location]"),
    deliveryFields: document.querySelector("[data-delivery-fields]"),
    useLocation: document.querySelector("[data-use-location]"),
    locationStatus: document.querySelector("[data-location-status]"),
    tooltipToggle: document.querySelector("[data-tooltip-toggle]"),
    tooltipPanel: document.querySelector("[data-tooltip-panel]"),
    rememberDetails: document.querySelector("[data-remember-details]"),
    checkout: document.querySelector("[data-checkout]"),
    checkoutStatus: document.querySelector("[data-checkout-status]"),
    modal: document.querySelector("[data-order-modal]"),
    modalClose: document.querySelectorAll("[data-modal-close]"),
    messengerLink: document.querySelector("[data-messenger-link]"),
    toast: document.querySelector("[data-toast]")
  };

  loadRememberedDetails();
  bindEvents();
  updateQuantity(0);
  updateDeliveryRequirement();

  function bindEvents() {
    els.minus.addEventListener("click", () => updateQuantity(-1));
    els.plus.addEventListener("click", () => updateQuantity(1));
    els.fulfillment.addEventListener("change", updateDeliveryRequirement);
    els.form.elements.deliveryAddress.addEventListener("input", updateDeliveryRequirement);
    els.useLocation.addEventListener("click", useCurrentLocation);
    els.tooltipToggle.addEventListener("click", toggleTooltip);
    els.rememberDetails.addEventListener("change", handleRememberDetailsChange);
    ["customerName", "contactNumber", "deliveryAddress", "mapsLink"].forEach((fieldName) => {
      els.form.elements[fieldName].addEventListener("input", saveRememberedDetailsIfEnabled);
    });
    els.fulfillment.addEventListener("change", saveRememberedDetailsIfEnabled);
    els.checkout.addEventListener("click", checkout);
    els.modalClose.forEach((element) => element.addEventListener("click", closeModal));

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
        closeTooltip();
      }
    });

    document.addEventListener("click", (event) => {
      if (!els.tooltipToggle.contains(event.target) && !els.tooltipPanel.contains(event.target)) {
        closeTooltip();
      }
    });

    window.addEventListener("scroll", () => {
      els.header.classList.toggle("is-scrolled", window.scrollY > 10);
    }, { passive: true });
  }

  function updateQuantity(delta) {
    state.quantity = Math.max(1, state.quantity + delta);
    els.quantity.value = state.quantity;
    els.quantity.textContent = state.quantity;
    els.minus.disabled = state.quantity === 1;
    els.subtotal.textContent = peso.format(total());
    updateSummaryCopy();
  }

  function updateDeliveryRequirement() {
    const deliveryAddress = els.form.elements.deliveryAddress;
    const needsDelivery = isLalamove();

    els.pickupLocation.classList.toggle("pickup-location-hidden", needsDelivery);
    els.deliveryFields.classList.toggle("delivery-fields-hidden", !needsDelivery);
    updateSummaryCopy();
    deliveryAddress.required = needsDelivery;
    deliveryAddress.setCustomValidity(needsDelivery && !deliveryAddress.value.trim()
      ? "Please enter the delivery address or landmark for Lalamove."
      : "");
  }

  function loadRememberedDetails() {
    const details = readRememberedDetails();

    if (!details) return;

    els.form.elements.customerName.value = details.customerName || "";
    els.form.elements.contactNumber.value = details.contactNumber || "";
    els.form.elements.fulfillment.value = details.fulfillment || "Pickup";
    if (!els.form.elements.fulfillment.value) els.form.elements.fulfillment.value = "Pickup";
    els.form.elements.deliveryAddress.value = details.deliveryAddress || "";
    els.form.elements.mapsLink.value = details.mapsLink || "";
    els.rememberDetails.checked = true;
  }

  function handleRememberDetailsChange() {
    if (els.rememberDetails.checked) {
      saveRememberedDetails();
      return;
    }

    removeRememberedDetails();
  }

  function saveRememberedDetailsIfEnabled() {
    if (els.rememberDetails.checked) saveRememberedDetails();
  }

  function saveRememberedDetails() {
    try {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({
        customerName: els.form.elements.customerName.value.trim(),
        contactNumber: els.form.elements.contactNumber.value.trim(),
        fulfillment: els.form.elements.fulfillment.value,
        deliveryAddress: els.form.elements.deliveryAddress.value.trim(),
        mapsLink: els.form.elements.mapsLink.value.trim()
      }));
    } catch (error) {
      console.warn("Could not save remembered details.", error);
    }
  }

  function readRememberedDetails() {
    try {
      const details = localStorage.getItem(REMEMBER_KEY);
      return details ? JSON.parse(details) : null;
    } catch (error) {
      console.warn("Could not load remembered details.", error);
      return null;
    }
  }

  function removeRememberedDetails() {
    try {
      localStorage.removeItem(REMEMBER_KEY);
    } catch (error) {
      console.warn("Could not remove remembered details.", error);
    }
  }

  function checkout() {
    updateDeliveryRequirement();
    if (!els.form.reportValidity()) return;

    const message = buildOrderMessage();
    const messengerUrl = BUSINESS.messengerUrl;
    saveRememberedDetailsIfEnabled();

    copyToClipboard(message).finally(() => {
      els.checkoutStatus.textContent = "Order copied. Open Messenger and paste it to send.";
      els.messengerLink.href = messengerUrl;
      openModal();
    });
  }

  function buildOrderMessage() {
    const formData = new FormData(els.form);
    const fulfillment = formData.get("fulfillment");
    const preferredDate = formData.get("preferredDate")?.trim();
    const preferredTime = formData.get("preferredTime")?.trim();
    const deliveryAddress = formData.get("deliveryAddress")?.trim();
    const mapsLink = formData.get("mapsLink")?.trim();
    const needsDelivery = isLalamove();
    const messageLines = [
      `Hello ${BUSINESS.name}! I would like to order your Signature Cream Puff Box from your website.`,
      "",
      `Customer name: ${formData.get("customerName")?.trim()}`,
      `Contact number: ${formData.get("contactNumber")?.trim()}`,
      `Preferred date: ${preferredDate}`,
      `Preferred time: ${preferredTime}`,
      `Order option: ${fulfillment}`
    ];

    if (needsDelivery) {
      messageLines.push(
        `Delivery address / landmark: ${deliveryAddress}`,
        `Google Maps link: ${mapsLink || "Not provided"}`
      );
    } else {
      messageLines.push(`Pickup location: ${BUSINESS.pickupMapUrl}`);
    }

    messageLines.push(
      "",
      "Items:",
      `- ${state.quantity} x ${PRODUCT.name} (${peso.format(PRODUCT.price)} each): ${peso.format(total())}`,
      "",
      `${needsDelivery ? "Subtotal before delivery fee" : "Total"}: ${peso.format(total())}`,
      needsDelivery
        ? "Lalamove note: Jinnamee can book the Lalamove rider for convenience. Customer will pay the delivery fee. Final total will be confirmed in Messenger."
        : "Pickup note: No delivery fee added.",
      "",
      `Notes: ${formData.get("notes")?.trim() || "None"}`,
      "",
      needsDelivery
        ? "Please confirm availability, Lalamove booking details, delivery fee, and final total. Thank you!"
        : "Please confirm availability, pickup instructions, and final total. Thank you!"
    );

    return messageLines.join("\n");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available on this browser. You can still type your address or paste a Google Maps link.", "error");
      return;
    }

    els.useLocation.disabled = true;
    setLocationStatus("Getting your location...", "pending");

    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      els.form.elements.mapsLink.value = `https://www.google.com/maps?q=${lat},${lng}`;
      saveRememberedDetailsIfEnabled();
      setLocationStatus("Location link added. Please still include your address or landmark.", "success");
      els.useLocation.disabled = false;
    }, () => {
      setLocationStatus("Location was not shared. You can still type your address or paste a Google Maps link.", "error");
      els.useLocation.disabled = false;
    }, {
      enableHighAccuracy: true,
      maximumAge: 60000,
      timeout: 10000
    });
  }

  function setLocationStatus(message, status) {
    els.locationStatus.textContent = message;
    els.locationStatus.dataset.status = status;
  }

  function toggleTooltip(event) {
    event.stopPropagation();
    const isOpen = els.tooltipToggle.getAttribute("aria-expanded") === "true";
    els.tooltipToggle.setAttribute("aria-expanded", String(!isOpen));
    els.tooltipPanel.classList.toggle("is-visible", !isOpen);
    els.tooltipPanel.hidden = isOpen;
  }

  function closeTooltip() {
    els.tooltipToggle.setAttribute("aria-expanded", "false");
    els.tooltipPanel.classList.remove("is-visible");
    els.tooltipPanel.hidden = true;
  }

  async function copyToClipboard(message) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        showToast("Order copied for Messenger.");
        return;
      }
    } catch (error) {
      console.warn("Clipboard API copy failed; trying fallback.", error);
    }

    copyWithTemporaryTextarea(message);
    showToast("Order copied for Messenger.");
  }

  function copyWithTemporaryTextarea(message) {
    const textarea = document.createElement("textarea");
    textarea.value = message;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.append(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
      document.execCommand("copy");
    } catch (error) {
      console.warn("Fallback clipboard copy failed.", error);
    }

    textarea.remove();
  }

  function openModal() {
    els.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-modal-open");
  }

  function closeModal() {
    els.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-modal-open");
  }

  function isLalamove() {
    return els.fulfillment.value.toLowerCase().includes("lalamove");
  }

  function updateSummaryCopy() {
    if (isLalamove()) {
      els.summaryLabel.textContent = "Subtotal";
      els.summaryNote.textContent = "Delivery fee is not included yet. Jinnamee can book the rider and the fee is added in the total.";
      return;
    }

    els.summaryLabel.textContent = "Total";
    els.summaryNote.textContent = "Pickup total";
  }

  function total() {
    return state.quantity * PRODUCT.price;
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 2500);
  }
})();
