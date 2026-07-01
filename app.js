(function () {
  const PRODUCT = {
    name: "Signature Cream Puff Box",
    price: 150,
    flavors: {
      original: "Original",
      chocolate: "Chocolate"
    }
  };
  const BUSINESS = {
    name: "Jinnamee's Patisserie",
    messengerUrl: "https://m.me/jinnameespatisserie",
    pickupMapUrl: "https://maps.app.goo.gl/FFJx3Umqaqbdw6dR8"
  };
  const ORDER_EMAIL_ENDPOINT = "https://formsubmit.co/ajax/rgiancabrera@gmail.com";
  const STEP_NAMES = [
    "Place your order",
    "Customer details",
    "Order details",
    "Notes",
    "Review and copy"
  ];
  const REMEMBER_KEY = "jinnameesRememberedDetails";
  const QUANTITY_STORAGE_VERSION = 2;
  const mobileQuery = window.matchMedia("(max-width: 679px)");
  const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  });

  const state = {
    quantities: {
      original: 0,
      chocolate: 0
    },
    carouselIndex: 0,
    carouselTouchStartX: null,
    currentStep: 1,
    latestOrderMessage: "",
    mobileCopied: false,
    emailStates: new Map()
  };

  const els = {
    header: document.querySelector("[data-header]"),
    form: document.querySelector("[data-order-form]"),
    steps: Array.from(document.querySelectorAll("[data-step]")),
    nextButtons: document.querySelectorAll("[data-next-step]"),
    previousButtons: document.querySelectorAll("[data-previous-step]"),
    closeWizard: document.querySelector("[data-close-wizard]"),
    currentStep: document.querySelector("[data-current-step]"),
    stepName: document.querySelector("[data-step-name]"),
    progressTrack: document.querySelector("[data-progress-track]"),
    progressBar: document.querySelector("[data-progress-bar]"),
    quantityButtons: Array.from(document.querySelectorAll("[data-quantity-change]")),
    quantityOutputs: Array.from(document.querySelectorAll("[data-flavor-quantity]")),
    quantityFieldset: document.querySelector("[data-flavor-quantities]"),
    quantityError: document.querySelector("[data-quantity-error]"),
    subtotals: document.querySelectorAll("[data-subtotal]"),
    preferredDate: document.querySelector("[name='preferredDate']"),
    summaryLabel: document.querySelector("[data-summary-label]"),
    summaryNote: document.querySelector("[data-summary-note]"),
    fulfillmentOptions: Array.from(document.querySelectorAll("[data-fulfillment]")),
    pickupLocation: document.querySelector("[data-pickup-location]"),
    deliveryFields: document.querySelector("[data-delivery-fields]"),
    useLocation: document.querySelector("[data-use-location]"),
    locationStatus: document.querySelector("[data-location-status]"),
    tooltipToggle: document.querySelector("[data-tooltip-toggle]"),
    tooltipPanel: document.querySelector("[data-tooltip-panel]"),
    rememberDetails: document.querySelector("[data-remember-details]"),
    checkout: document.querySelector("[data-checkout]"),
    checkoutStatus: document.querySelector("[data-checkout-status]"),
    mobileMessagePreview: document.querySelector("[data-mobile-message-preview]"),
    mobileCopy: document.querySelector("[data-mobile-copy]"),
    mobileCopyText: document.querySelector("[data-mobile-copy-text]"),
    mobileMessenger: document.querySelector("[data-mobile-messenger]"),
    modal: document.querySelector("[data-order-modal]"),
    modalClose: document.querySelectorAll("[data-modal-close]"),
    messengerLink: document.querySelector("[data-messenger-link]"),
    messagePreview: document.querySelector("[data-message-preview]"),
    copyPreview: document.querySelector("[data-copy-preview]"),
    copyPreviewStatus: document.querySelector("[data-copy-preview-status]"),
    toast: document.querySelector("[data-toast]"),
    toastText: document.querySelector("[data-toast-text]"),
    carousel: document.querySelector("[data-carousel]"),
    carouselSlides: Array.from(document.querySelectorAll("[data-carousel-slide]")),
    carouselDots: Array.from(document.querySelectorAll("[data-carousel-dot]")),
    carouselPrevious: document.querySelector("[data-carousel-previous]"),
    carouselNext: document.querySelector("[data-carousel-next]")
  };

  els.rememberDetails.checked = true;
  loadRememberedDetails();
  bindEvents();
  refreshDateMinimum();
  renderQuantities(false);
  showCarouselSlide(0);
  updateDeliveryRequirement();
  updateResponsiveMode();

  function bindEvents() {
    els.quantityButtons.forEach((button) => {
      button.addEventListener("click", () => {
        updateQuantity(button.dataset.flavor, Number(button.dataset.quantityChange));
      });
    });
    els.preferredDate.addEventListener("input", validatePreferredDate);
    els.preferredDate.addEventListener("focus", refreshDateMinimum);
    els.carouselPrevious.addEventListener("click", () => showCarouselSlide(state.carouselIndex - 1));
    els.carouselNext.addEventListener("click", () => showCarouselSlide(state.carouselIndex + 1));
    els.carouselDots.forEach((dot) => {
      dot.addEventListener("click", () => showCarouselSlide(Number(dot.dataset.carouselDot)));
    });
    els.carousel.addEventListener("keydown", handleCarouselKeydown);
    els.carousel.addEventListener("touchstart", handleCarouselTouchStart, { passive: true });
    els.carousel.addEventListener("touchend", handleCarouselTouchEnd, { passive: true });
    els.fulfillmentOptions.forEach((option) => {
      option.addEventListener("change", () => {
        updateDeliveryRequirement();
        saveRememberedDetailsIfEnabled();
        invalidateMobileCopy();
      });
    });
    els.form.elements.deliveryAddress.addEventListener("input", updateDeliveryRequirement);
    els.useLocation.addEventListener("click", useCurrentLocation);
    els.tooltipToggle.addEventListener("click", toggleTooltip);
    els.rememberDetails.addEventListener("change", handleRememberDetailsChange);
    els.form.addEventListener("input", handleFormInput);
    els.nextButtons.forEach((button) => button.addEventListener("click", handleNextStep));
    els.previousButtons.forEach((button) => {
      button.addEventListener("click", () => showStep(Number(button.dataset.previousStep)));
    });
    els.closeWizard.addEventListener("click", () => showStep(1));
    els.mobileCopy.addEventListener("click", copyMobileOrder);
    els.mobileMessenger.addEventListener("click", handleMobileMessengerClick);
    els.checkout.addEventListener("click", checkoutDesktop);
    els.copyPreview.addEventListener("click", copyPreviewMessage);
    els.modalClose.forEach((element) => element.addEventListener("click", closeModal));

    const onBreakpointChange = () => updateResponsiveMode();
    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", onBreakpointChange);
    else mobileQuery.addListener(onBreakpointChange);

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
    window.addEventListener("focus", refreshDateMinimum);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshDateMinimum();
    });
  }

  function handleFormInput(event) {
    if (event.target === els.rememberDetails) return;
    saveRememberedDetailsIfEnabled();
    invalidateMobileCopy();
  }

  function handleNextStep(event) {
    const currentStep = Number(event.currentTarget.closest("[data-step]").dataset.step);
    const nextStep = Number(event.currentTarget.dataset.nextStep);

    if (!validateStep(currentStep)) return;
    if (nextStep === 5) prepareMobileReview();
    showStep(nextStep);
  }

  function validateStep(stepNumber) {
    updateDeliveryRequirement();
    if (stepNumber === 1 && !validateFlavorQuantity()) return false;
    if (stepNumber === 3) {
      refreshDateMinimum();
      validatePreferredDate();
    }
    const step = els.steps.find((item) => Number(item.dataset.step) === stepNumber);
    const controls = Array.from(step.querySelectorAll("input, textarea, select"));
    const invalidControl = controls.find((control) => control.willValidate && !control.checkValidity());

    if (!invalidControl) return true;
    invalidControl.reportValidity();
    invalidControl.focus({ preventScroll: true });
    invalidControl.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  function validateEntireForm() {
    updateDeliveryRequirement();
    if (!validateFlavorQuantity()) return false;
    refreshDateMinimum();
    validatePreferredDate();
    const controls = Array.from(els.form.elements);
    const invalidControl = controls.find((control) => control.willValidate && !control.checkValidity());

    if (!invalidControl) return true;
    invalidControl.reportValidity();
    invalidControl.focus();
    return false;
  }

  function showStep(stepNumber) {
    state.currentStep = Math.min(5, Math.max(1, stepNumber));
    if (!mobileQuery.matches) return;

    els.steps.forEach((step) => {
      const isActive = Number(step.dataset.step) === state.currentStep;
      step.classList.toggle("is-active", isActive);
      step.setAttribute("aria-hidden", String(!isActive));
    });

    els.currentStep.textContent = state.currentStep;
    els.stepName.textContent = STEP_NAMES[state.currentStep - 1];
    els.progressTrack.setAttribute("aria-valuenow", state.currentStep);
    els.progressBar.style.width = `${state.currentStep * 20}%`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateResponsiveMode() {
    document.body.classList.toggle("is-mobile-order", mobileQuery.matches);
    if (mobileQuery.matches) {
      closeModal();
      showStep(state.currentStep);
      return;
    }

    els.steps.forEach((step) => {
      step.classList.add("is-active");
      step.setAttribute("aria-hidden", "false");
    });
  }

  function updateQuantity(flavor, delta, shouldPersist = true) {
    if (!(flavor in state.quantities)) return;
    state.quantities[flavor] = Math.max(0, state.quantities[flavor] + delta);
    renderQuantities(shouldPersist);
  }

  function renderQuantities(shouldPersist = true) {
    els.quantityOutputs.forEach((output) => {
      output.value = state.quantities[output.dataset.flavorQuantity];
      output.textContent = state.quantities[output.dataset.flavorQuantity];
    });
    els.quantityButtons.forEach((button) => {
      if (Number(button.dataset.quantityChange) < 0) {
        button.disabled = state.quantities[button.dataset.flavor] === 0;
      }
    });
    els.subtotals.forEach((element) => {
      element.textContent = peso.format(total());
    });
    validateFlavorQuantity(false);
    updateSummaryCopy();
    invalidateMobileCopy();
    if (shouldPersist) saveRememberedDetailsIfEnabled();
  }

  function validateFlavorQuantity(announce = true) {
    const isValid = totalQuantity() > 0;
    els.quantityFieldset.setAttribute("aria-invalid", String(!isValid));
    els.quantityError.textContent = isValid || !announce ? "" : "Choose at least one Original or Chocolate box.";
    els.quantityError.classList.toggle("is-visible", !isValid && announce);
    if (!isValid && announce) {
      els.quantityFieldset.scrollIntoView({ behavior: "smooth", block: "center" });
      els.quantityButtons.find((button) => Number(button.dataset.quantityChange) > 0)?.focus({ preventScroll: true });
    }
    return isValid;
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

    if (details.quantityStorageVersion === QUANTITY_STORAGE_VERSION) {
      state.quantities.original = parseRememberedQuantity(details.originalQuantity);
      state.quantities.chocolate = parseRememberedQuantity(details.chocolateQuantity);
    }
    els.form.elements.customerName.value = details.customerName || "";
    els.form.elements.contactNumber.value = details.contactNumber || "";
    els.form.elements.preferredTime.value = details.preferredTime || "";
    els.form.elements.deliveryAddress.value = details.deliveryAddress || "";
    els.form.elements.mapsLink.value = details.mapsLink || "";
    els.form.elements.notes.value = details.notes || "";

    const savedFulfillment = String(details.fulfillment || "Pickup").toLowerCase();
    const matchingOption = els.fulfillmentOptions.find((option) => (
      savedFulfillment.includes("lalamove") === option.value.toLowerCase().includes("lalamove")
    ));
    if (matchingOption) matchingOption.checked = true;
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
        quantityStorageVersion: QUANTITY_STORAGE_VERSION,
        originalQuantity: state.quantities.original,
        chocolateQuantity: state.quantities.chocolate,
        customerName: els.form.elements.customerName.value.trim(),
        contactNumber: els.form.elements.contactNumber.value.trim(),
        preferredTime: els.form.elements.preferredTime.value.trim(),
        fulfillment: getFulfillment(),
        deliveryAddress: els.form.elements.deliveryAddress.value.trim(),
        mapsLink: els.form.elements.mapsLink.value.trim(),
        notes: els.form.elements.notes.value.trim()
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

  function parseRememberedQuantity(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function removeRememberedDetails() {
    try {
      localStorage.removeItem(REMEMBER_KEY);
    } catch (error) {
      console.warn("Could not remove remembered details.", error);
    }
  }

  function prepareMobileReview() {
    const message = buildOrderMessage();
    state.latestOrderMessage = message;
    els.mobileMessagePreview.value = message;
    invalidateMobileCopy();
  }

  function copyMobileOrder() {
    const message = buildOrderMessage();
    state.latestOrderMessage = message;
    els.mobileMessagePreview.value = message;

    copyToClipboard(message).then(() => {
      state.mobileCopied = true;
      els.mobileCopy.classList.add("is-copied");
      els.mobileCopyText.textContent = "Copy Again";
      els.mobileMessenger.href = BUSINESS.messengerUrl;
      els.mobileMessenger.setAttribute("aria-disabled", "false");
      els.mobileMessenger.removeAttribute("tabindex");
      showToast("Copied Order Details");
    });
  }

  function invalidateMobileCopy() {
    state.mobileCopied = false;
    els.mobileCopy.classList.remove("is-copied");
    els.mobileCopyText.textContent = "Copy Order Details";
    els.mobileMessenger.removeAttribute("href");
    els.mobileMessenger.setAttribute("aria-disabled", "true");
    els.mobileMessenger.setAttribute("tabindex", "-1");
  }

  function handleMobileMessengerClick(event) {
    if (!state.mobileCopied) {
      event.preventDefault();
      return;
    }

    sendOrderEmail();
  }

  function sendOrderEmail() {
    const message = buildOrderMessage();
    const existingState = state.emailStates.get(message);
    if (existingState === "sending" || existingState === "sent") return;

    state.emailStates.set(message, "sending");
    const formData = new FormData(els.form);
    const needsDelivery = isLalamove();
    const payload = {
      _subject: `New Jinnamee Website Order - ${formData.get("customerName")?.trim() || "Customer"}`,
      _cc: "jenmae03@gmail.com",
      _template: "table",
      _captcha: "false",
      _honey: formData.get("_honey") || "",
      "Website source": "JNP-WEB",
      "Product": PRODUCT.name,
      "Original boxes": String(state.quantities.original),
      "Chocolate boxes": String(state.quantities.chocolate),
      "Total boxes": String(totalQuantity()),
      "Price per box": peso.format(PRODUCT.price),
      "Customer name": formData.get("customerName")?.trim() || "",
      "Contact number": formData.get("contactNumber")?.trim() || "",
      "Preferred date": formData.get("preferredDate")?.trim() || "",
      "Preferred time": formData.get("preferredTime")?.trim() || "",
      "Order option": getFulfillment(),
      "Order amount": needsDelivery
        ? `${peso.format(total())} subtotal before delivery fee`
        : `${peso.format(total())} total`,
      "Notes": formData.get("notes")?.trim() || "None",
      "Messenger action": "Customer clicked I will Paste this Order in Messenger",
      "Submitted at": new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })
    };

    if (needsDelivery) {
      payload["Delivery address / landmark"] = formData.get("deliveryAddress")?.trim() || "";
      payload["Google Maps link"] = formData.get("mapsLink")?.trim() || "Not provided";
      payload["Delivery fee"] = "Customer pays; Jinnamee can book the rider";
    } else {
      payload["Pickup location"] = BUSINESS.pickupMapUrl;
    }

    try {
      fetch(ORDER_EMAIL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).then((response) => {
        if (!response.ok) throw new Error(`Order email request failed with ${response.status}`);
        state.emailStates.set(message, "sent");
      }).catch((error) => {
        state.emailStates.delete(message);
        console.warn("Order email could not be sent.", error);
      });
    } catch (error) {
      state.emailStates.delete(message);
      console.warn("Order email could not be started.", error);
    }
  }

  function checkoutDesktop() {
    if (!validateEntireForm()) return;

    const message = buildOrderMessage();
    saveRememberedDetailsIfEnabled();
    setModalMessagePreview(message);

    copyToClipboard(message).finally(() => {
      showToast("Order copied for Messenger");
      els.checkoutStatus.textContent = "Order copied. Open Messenger and paste it to send.";
      els.messengerLink.href = BUSINESS.messengerUrl;
      openModal();
    });
  }

  function buildOrderMessage() {
    const formData = new FormData(els.form);
    const fulfillment = getFulfillment();
    const preferredDate = formData.get("preferredDate")?.trim();
    const preferredTime = formData.get("preferredTime")?.trim();
    const deliveryAddress = formData.get("deliveryAddress")?.trim();
    const mapsLink = formData.get("mapsLink")?.trim();
    const needsDelivery = isLalamove();
    const itemLines = Object.entries(PRODUCT.flavors)
      .filter(([flavor]) => state.quantities[flavor] > 0)
      .map(([flavor, label]) => {
        const quantity = state.quantities[flavor];
        return `- ${quantity} x ${label} ${PRODUCT.name} (${peso.format(PRODUCT.price)} each): ${peso.format(quantity * PRODUCT.price)}`;
      });
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
      ...itemLines,
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
        : "Please confirm availability, pickup instructions, and final total. Thank you!",
      "",
      "Thanks for ordering at jinnameespatisserie.com!"
    );

    return messageLines.join("\n");
  }

  function refreshDateMinimum() {
    els.preferredDate.min = getTomorrowInManila();
    validatePreferredDate();
  }

  function validatePreferredDate() {
    const value = els.preferredDate.value;
    const isTooEarly = value && value < els.preferredDate.min;
    els.preferredDate.setCustomValidity(isTooEarly
      ? "Please choose tomorrow or a later date for your preorder."
      : "");
    return !isTooEarly;
  }

  function getTomorrowInManila() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const tomorrow = new Date(Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day) + 1
    ));
    return [
      tomorrow.getUTCFullYear(),
      String(tomorrow.getUTCMonth() + 1).padStart(2, "0"),
      String(tomorrow.getUTCDate()).padStart(2, "0")
    ].join("-");
  }

  function showCarouselSlide(index) {
    const slideCount = els.carouselSlides.length;
    state.carouselIndex = (index + slideCount) % slideCount;
    els.carouselSlides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === state.carouselIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });
    els.carouselDots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === state.carouselIndex;
      dot.classList.toggle("is-active", isActive);
      if (isActive) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  function handleCarouselKeydown(event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showCarouselSlide(state.carouselIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showCarouselSlide(state.carouselIndex + 1);
    }
  }

  function handleCarouselTouchStart(event) {
    state.carouselTouchStartX = event.changedTouches[0]?.clientX ?? null;
  }

  function handleCarouselTouchEnd(event) {
    if (state.carouselTouchStartX === null) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX === undefined) return;
    const distance = endX - state.carouselTouchStartX;
    state.carouselTouchStartX = null;
    if (Math.abs(distance) < 45) return;
    showCarouselSlide(state.carouselIndex + (distance < 0 ? 1 : -1));
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
      invalidateMobileCopy();
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
        return;
      }
    } catch (error) {
      console.warn("Clipboard API copy failed; trying fallback.", error);
    }
    copyWithTemporaryTextarea(message);
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

  function setModalMessagePreview(message) {
    state.latestOrderMessage = message;
    els.messagePreview.value = message;
    els.copyPreviewStatus.textContent = "";
  }

  function copyPreviewMessage() {
    const message = state.latestOrderMessage || els.messagePreview.value;
    if (!message) return;

    copyToClipboard(message).then(() => {
      els.copyPreviewStatus.textContent = "Copied again.";
    });
  }

  function openModal() {
    if (mobileQuery.matches) return;
    els.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-modal-open");
  }

  function closeModal() {
    els.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-modal-open");
    els.copyPreviewStatus.textContent = "";
  }

  function getFulfillment() {
    return els.fulfillmentOptions.find((option) => option.checked)?.value || "Pickup";
  }

  function isLalamove() {
    return getFulfillment().toLowerCase().includes("lalamove");
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
    return totalQuantity() * PRODUCT.price;
  }

  function totalQuantity() {
    return Object.values(state.quantities).reduce((sum, quantity) => sum + quantity, 0);
  }

  function showToast(message) {
    els.toastText.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 1800);
  }
})();
