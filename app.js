(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const fileInput = $('#file-input');
  const dropZone = $('#drop-zone');
  const fileCard = $('#file-card');
  const fileName = $('#file-name');
  const fileSize = $('#file-size');
  const fileWarning = $('#file-warning');
  const removeFileButton = $('#remove-file');
  const passwordInput = $('#password');
  const confirmInput = $('#confirm-password');
  const matchMessage = $('#password-match');
  const strengthLabel = $('#strength-label');
  const strengthBar = $('#strength-bar');
  const generateButton = $('#generate-password');
  const encryptButton = $('#encrypt-button');
  const buttonLabel = encryptButton.querySelector('.button-label');
  const buttonLoading = encryptButton.querySelector('.button-loading');
  const statusMessage = $('#status-message');

  let selectedFile = null;
  let isProcessing = false;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index === 0 || value >= 10 ? 0 : 1)} ${units[index]}`;
  };

  const protectedFileName = (name) => {
    const base = name.replace(/\.pdf$/i, '').trim() || 'document';
    return `${base}-protected.pdf`;
  };

  const setStatus = (type, message) => {
    statusMessage.className = `status-message ${type}`;
    statusMessage.textContent = message;
    statusMessage.hidden = false;
  };

  const clearStatus = () => {
    statusMessage.hidden = true;
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
  };

  const setProcessing = (processing) => {
    isProcessing = processing;
    buttonLabel.hidden = processing;
    buttonLoading.hidden = !processing;
    passwordInput.disabled = processing;
    confirmInput.disabled = processing;
    fileInput.disabled = processing;
    removeFileButton.disabled = processing;
    generateButton.disabled = processing;
    dropZone.disabled = processing;
    updateButtonState();
  };

  const passwordScore = (password) => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(score, 5);
  };

  const updateStrength = () => {
    const password = passwordInput.value;
    const score = passwordScore(password);
    const labels = ['Not set', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
    strengthLabel.textContent = labels[score];
    strengthLabel.dataset.score = String(score);
    strengthBar.dataset.score = String(score);
  };

  const updatePasswordMatch = () => {
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    matchMessage.className = 'field-message';

    if (!confirm) {
      matchMessage.textContent = '';
      return;
    }

    if (password === confirm) {
      matchMessage.textContent = 'Passwords match.';
      matchMessage.classList.add('is-success');
    } else {
      matchMessage.textContent = 'Passwords do not match.';
      matchMessage.classList.add('is-error');
    }
  };

  const updateButtonState = () => {
    const valid = selectedFile && passwordInput.value.length > 0 && passwordInput.value === confirmInput.value;
    encryptButton.disabled = isProcessing || !valid;
  };

  const looksLikePdf = async (file) => {
    try {
      const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
      const signature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
      outer: for (let i = 0; i <= header.length - signature.length; i += 1) {
        for (let j = 0; j < signature.length; j += 1) {
          if (header[i + j] !== signature[j]) continue outer;
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const selectFile = async (file) => {
    clearStatus();
    fileWarning.hidden = true;
    fileWarning.textContent = '';

    if (!file) return;

    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStatus('error', 'Please select a PDF file.');
      return;
    }

    const validPdf = await looksLikePdf(file);
    if (!validPdf) {
      setStatus('error', 'This file does not appear to contain a valid PDF header.');
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    dropZone.hidden = true;
    fileCard.hidden = false;

    if (file.size > 100 * 1024 * 1024) {
      fileWarning.textContent = 'This is a large PDF. Encryption is still local, but your browser may use several times the file size in memory while processing it.';
      fileWarning.hidden = false;
    }

    updateButtonState();
  };

  const removeFile = () => {
    if (isProcessing) return;
    selectedFile = null;
    fileInput.value = '';
    fileCard.hidden = true;
    dropZone.hidden = false;
    fileWarning.hidden = true;
    fileWarning.textContent = '';
    clearStatus();
    updateButtonState();
  };

  const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_=+?';
    const bytes = new Uint8Array(22);
    crypto.getRandomValues(bytes);
    const generated = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
    passwordInput.value = generated;
    confirmInput.value = generated;
    updateStrength();
    updatePasswordMatch();
    updateButtonState();
    passwordInput.type = 'text';
    confirmInput.type = 'text';
    document.querySelectorAll('.password-toggle').forEach((button) => {
      button.classList.add('is-visible');
      button.setAttribute('aria-label', 'Hide password');
    });
  };

  const triggerDownload = (bytes, name) => {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const encryptPdf = async () => {
    if (isProcessing || !selectedFile) return;

    const password = passwordInput.value;
    if (!password) {
      setStatus('error', 'Enter a password first.');
      return;
    }
    if (password !== confirmInput.value) {
      setStatus('error', 'The two passwords do not match.');
      return;
    }
    if (!window.isSecureContext || !window.crypto?.subtle) {
      setStatus('error', 'AES-256 requires HTTPS or localhost. GitHub Pages uses HTTPS, so this should work once the site is published there.');
      return;
    }
    if (!window.PDFEncrypt?.encryptPDF) {
      setStatus('error', 'The PDF encryption library did not load. Check your internet connection, then reload the page.');
      return;
    }

    setProcessing(true);
    clearStatus();

    try {
      const sourceBytes = new Uint8Array(await selectedFile.arrayBuffer());
      const encryptedBytes = await window.PDFEncrypt.encryptPDF(sourceBytes, password, {
        algorithm: 'AES-256',
        ownerPassword: password,
        allowPrinting: true,
        allowHighQualityPrint: true,
        allowModifying: true,
        allowCopying: true,
        allowAnnotating: true,
        allowFillingForms: true,
        allowExtraction: true,
        allowAssembly: true
      });

      triggerDownload(encryptedBytes, protectedFileName(selectedFile.name));
      setStatus('success', 'Encryption complete. Your password-protected PDF has been downloaded. Open it once to confirm the password before deleting the original.');

      // Avoid retaining the plaintext password in the form after a successful run.
      passwordInput.value = '';
      confirmInput.value = '';
      updateStrength();
      updatePasswordMatch();
    } catch (error) {
      console.error('Local PDF encryption failed:', error);
      const code = error?.code || '';
      const name = error?.name || '';
      const message = String(error?.message || error || '');

      if (code === 'ALREADY_ENCRYPTED' || name === 'AlreadyEncryptedError' || /already.*encrypted|already.*password/i.test(message)) {
        setStatus('error', 'This PDF is already password-protected. Remove its existing protection before applying a new password.');
      } else if (name === 'PasswordEncodingError') {
        setStatus('error', message || 'That password contains a character that cannot be safely used for PDF encryption. Try a different password.');
      } else if (/encrypted/i.test(message) && /password/i.test(message)) {
        setStatus('error', 'This PDF appears to be encrypted already and cannot be re-encrypted directly.');
      } else {
        setStatus('error', 'The PDF could not be encrypted. It may be damaged, unusually structured, or too large for the available browser memory. Your file was not uploaded anywhere.');
      }
    } finally {
      setProcessing(false);
      updateButtonState();
    }
  };

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => selectFile(fileInput.files?.[0]));
  removeFileButton.addEventListener('click', removeFile);

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (!isProcessing) dropZone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove('is-dragging');
    });
  });

  dropZone.addEventListener('drop', (event) => {
    if (isProcessing) return;
    const files = event.dataTransfer?.files;
    if (files?.length) selectFile(files[0]);
  });

  [passwordInput, confirmInput].forEach((input) => {
    input.addEventListener('input', () => {
      clearStatus();
      updateStrength();
      updatePasswordMatch();
      updateButtonState();
    });
  });

  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.target);
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.classList.toggle('is-visible', !showing);
      button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  });

  generateButton.addEventListener('click', generatePassword);
  encryptButton.addEventListener('click', encryptPdf);

  updateStrength();
  updateButtonState();
})();
