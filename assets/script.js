    document.addEventListener('DOMContentLoaded', () => {
        // DOM Elements
        const imageUpload = document.getElementById('imageUpload');
        const uploadArea = document.getElementById('uploadArea');
        const imageCanvas = document.getElementById('imageCanvas');
        const mainCtx = imageCanvas.getContext('2d');
        const cropCanvasOverlay = document.getElementById('cropCanvasOverlay');
        const cropCtx = cropCanvasOverlay.getContext('2d');
        const imagePreviewArea = document.getElementById('imagePreviewArea');


        const imagePlaceholder = document.getElementById('imagePlaceholder');
        const loader = document.getElementById('loader');
        const messageBox = document.getElementById('messageBox');

        const imageNameEl = document.getElementById('imageName');
        const originalDimensionsEl = document.getElementById('originalDimensions');
        const currentDimensionsEl = document.getElementById('currentDimensions');
        const imageTypeEl = document.getElementById('imageType');

        const imageInfoSection = document.getElementById('imageInfoSection');
        const operationsSection = document.getElementById('operationsSection');
        const utilitiesSection = document.getElementById('utilitiesSection');

        const resizeWidthInput = document.getElementById('resizeWidth');
        const resizeHeightInput = document.getElementById('resizeHeight');
        const aspectRatioLock = document.getElementById('aspectRatioLock');
        const resizePercentInput = document.getElementById('resizePercent');
        const applyResizeBtn = document.getElementById('applyResize');

        // Crop specific
        const toggleInteractiveCropBtn = document.getElementById('toggleInteractiveCrop');
        const cropXInput = document.getElementById('cropX');
        const cropYInput = document.getElementById('cropY');
        const cropWidthInput = document.getElementById('cropWidth');
        const cropHeightInput = document.getElementById('cropHeight');
        const applyCropBtn = document.getElementById('applyCrop');


        const rotateLeftBtn = document.getElementById('rotateLeft');
        const rotateRightBtn = document.getElementById('rotateRight');
        const flipHorizontalBtn = document.getElementById('flipHorizontal');
        const flipVerticalBtn = document.getElementById('flipVertical');

        const brightnessSlider = document.getElementById('brightness');
        const contrastSlider = document.getElementById('contrast');
        const saturationSlider = document.getElementById('saturation');
        const brightnessValueEl = document.getElementById('brightnessValue');
        const contrastValueEl = document.getElementById('contrastValue');
        const saturationValueEl = document.getElementById('saturationValue');
        const grayscaleCheckbox = document.getElementById('grayscale');
        const sepiaCheckbox = document.getElementById('sepia');
        const invertCheckbox = document.getElementById('invert');
        const applyFiltersBtn = document.getElementById('applyFilters');

        const outputFormatSelect = document.getElementById('outputFormat');
        const outputQualitySlider = document.getElementById('outputQuality');
        const qualityValueEl = document.getElementById('qualityValue');
        const qualitySliderContainer = document.getElementById('qualitySliderContainer');
        const targetFileSizeInput = document.getElementById('targetFileSize');
        const targetFileSizeContainer = document.getElementById('targetFileSizeContainer');
        const downloadButton = document.getElementById('downloadButton');
        const downloadBySizeButton = document.getElementById('downloadBySizeButton');

        const resetButton = document.getElementById('resetButton');
        const clearButton = document.getElementById('clearButton');

        document.getElementById('currentYear').textContent = new Date().getFullYear();

        // App State
        let originalImage = null;
        let currentImage = null;
        let originalFileName = 'image.png';
        let originalType = 'image/png';
        let originalWidth = 0;
        let originalHeight = 0;
        let currentFilters = {
            brightness: 0, contrast: 0, saturation: 0,
            grayscale: false, sepia: false, invert: false
        };

        // Interactive Crop State
        let isInteractiveCropActive = false;
        let cropRect = { x: 50, y: 50, width: 100, height: 100 };
        let isDraggingCropRect = false;
        let isResizingCropRect = false;
        let resizeHandle = '';
        let dragStartX, dragStartY;
        const handleSize = 8;
        let cropSelectionRafId = null;


        // --- Helper Functions ---
        function showLoader() { loader.style.display = 'block'; imagePlaceholder.setAttribute('aria-hidden', 'true'); }
        function hideLoader() { loader.style.display = 'none'; imagePlaceholder.setAttribute('aria-hidden', imageCanvas.style.opacity === '0');}

        function showMessage(message, type = 'success', duration = 3000) {
            messageBox.textContent = message;
            messageBox.className = 'message-box';
            messageBox.classList.add(type);
            messageBox.classList.add('show');
            setTimeout(() => {
                messageBox.classList.remove('show');
            }, duration);
        }

        function updateImageInfo(img, isOriginal = false) {
            if (isOriginal) {
                originalDimensionsEl.textContent = `${img.width} x ${img.height} px`;
                originalWidth = img.width;
                originalHeight = img.height;
            }
            currentDimensionsEl.textContent = `${img.width} x ${img.height} px`;
            imageTypeEl.textContent = originalType.split('/')[1].toUpperCase();
        }
        
        function resetUIState() {
            imagePlaceholder.style.display = 'block';
            imageCanvas.style.opacity = '0';
            imageCanvas.width = 0; imageCanvas.height = 0;
            cropCanvasOverlay.width = 0; cropCanvasOverlay.height = 0;
            imagePlaceholder.setAttribute('aria-hidden', 'false');


            imageInfoSection.classList.add('hidden');
            operationsSection.classList.add('hidden');
            utilitiesSection.classList.add('hidden');

            imageNameEl.textContent = 'N/A';
            originalDimensionsEl.textContent = 'N/A';
            currentDimensionsEl.textContent = 'N/A';
            imageTypeEl.textContent = 'N/A';
            
            const inputs = document.querySelectorAll('input[type="number"], input[type="range"]');
            inputs.forEach(input => {
                if (input.type === 'range') input.value = input.id === 'outputQuality' ? 0.92 : 0;
                else input.value = '';
            });

            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => checkbox.checked = false);
            aspectRatioLock.checked = true;
            outputFormatSelect.value = 'image/png';
            outputQualitySlider.value = 0.92;
            qualityValueEl.textContent = '0.92';
            targetFileSizeInput.value = '';
            
            if (isInteractiveCropActive) deactivateInteractiveCropMode();
            toggleInteractiveCropBtn.innerHTML = '<i class="fas fa-mouse-pointer mr-2"></i>Enable Interactive Crop';
            toggleInteractiveCropBtn.classList.remove('btn-danger');
            toggleInteractiveCropBtn.classList.add('btn-secondary');


            updateExportControlsVisibility();
            resetCurrentFilters();
            updateFilterValueDisplays();

            originalImage = null;
            currentImage = null;
        }
        
        function resetCurrentFilters() {
             currentFilters = {
                brightness: 0, contrast: 0, saturation: 0,
                grayscale: false, sepia: false, invert: false
            };
        }

        function updateFilterValueDisplays() {
            brightnessValueEl.textContent = brightnessSlider.value;
            contrastValueEl.textContent = contrastSlider.value;
            saturationValueEl.textContent = saturationSlider.value;
        }

        function drawImageToCanvas(imageToDraw, filtersToApply = null, callback) {
            return new Promise((resolve, reject) => {
                if (!imageToDraw || !imageToDraw.width || !imageToDraw.height) {
                    hideLoader();
                    reject(new Error("Invalid image for drawing"));
                    return;
                }
                showLoader();
                requestAnimationFrame(async () => {
                    try {
                        imageCanvas.width = imageToDraw.width;
                        imageCanvas.height = imageToDraw.height;
                        cropCanvasOverlay.width = imageCanvas.width;
                        cropCanvasOverlay.height = imageCanvas.height;
                        
                        // Ensure the canvas wrapper's style allows canvases to dictate its size for centering
                        const canvasWrapper = document.getElementById('canvasWrapper');
                        if (canvasWrapper) {
                           canvasWrapper.style.width = `${imageCanvas.offsetWidth}px`;
                           canvasWrapper.style.height = `${imageCanvas.offsetHeight}px`;
                        }


                        let filterString = '';
                        const activeFilters = filtersToApply || currentFilters;
                        if (activeFilters) {
                            if (activeFilters.brightness !== 0) filterString += `brightness(${100 + activeFilters.brightness}%) `;
                            if (activeFilters.contrast !== 0) filterString += `contrast(${100 + activeFilters.contrast}%) `;
                            if (activeFilters.saturation !== 0) filterString += `saturate(${100 + activeFilters.saturation}%) `;
                            if (activeFilters.grayscale) filterString += `grayscale(100%) `;
                            if (activeFilters.sepia) filterString += `sepia(100%) `;
                            if (activeFilters.invert) filterString += `invert(100%) `;
                        }
                        mainCtx.filter = filterString.trim();
                        mainCtx.drawImage(imageToDraw, 0, 0, imageToDraw.width, imageToDraw.height);
                        mainCtx.filter = 'none';

                        imagePlaceholder.style.display = 'none';
                        imagePlaceholder.setAttribute('aria-hidden', 'true');
                        imageCanvas.style.opacity = '1';
                        updateImageInfo(imageToDraw);

                        if (typeof callback === 'function') {
                            await callback();
                        }
                        const newImageState = new Image();
                        newImageState.onload = () => {
                            currentImage = newImageState;
                            hideLoader();
                            resolve();
                        };
                        newImageState.onerror = (err) => {
                            console.error("Error creating new image state from canvas data URL:", err);
                            hideLoader();
                            showMessage('Error updating image preview state.', 'error');
                            reject(new Error('Error creating image state from canvas'));
                        };
                        newImageState.src = imageCanvas.toDataURL(originalImage ? originalImage.type : 'image/png');
                    } catch (error) {
                        console.error("Error in drawImageToCanvas:", error);
                        hideLoader();
                        showMessage('Error drawing image to canvas.', 'error');
                        reject(error);
                    }
                });
            });
        }

        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageFile(file);
        });

        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (eventName === 'dragover') uploadArea.classList.add('dragover');
                else uploadArea.classList.remove('dragover');
                if (eventName === 'drop') {
                    const file = e.dataTransfer.files[0];
                    if (file) handleImageFile(file);
                }
            });
        });

        async function handleImageFile(file) {
            if (!file.type.startsWith('image/')) {
                showMessage('Invalid file type. Please upload an image.', 'error');
                return;
            }
            showLoader();
            originalFileName = file.name;
            originalType = file.type;

            const reader = new FileReader();
            reader.onload = (e) => {
                originalImage = new Image();
                originalImage.type = originalType;
                originalImage.onload = async () => {
                    try {
                        currentImage = originalImage;
                        await drawImageToCanvas(currentImage, currentFilters, () => {
                            if (isInteractiveCropActive) scheduleDrawCropSelection();
                        });
                        
                        updateImageInfo(currentImage, true);
                        
                        imageNameEl.textContent = originalFileName;
                        imageInfoSection.classList.remove('hidden');
                        operationsSection.classList.remove('hidden');
                        utilitiesSection.classList.remove('hidden');
                        
                        resizeWidthInput.value = currentImage.width;
                        resizeHeightInput.value = currentImage.height;
                        resizePercentInput.value = 100;
                        
                        cropRect.x = Math.max(0, Math.round(currentImage.width * 0.1));
                        cropRect.y = Math.max(0, Math.round(currentImage.height * 0.1));
                        cropRect.width = Math.max(50, Math.round(currentImage.width * 0.8));
                        cropRect.height = Math.max(50, Math.round(currentImage.height * 0.8));
                        updateCropInputsFromRect();
                        if (isInteractiveCropActive) scheduleDrawCropSelection();

                        resetCurrentFilters();
                        brightnessSlider.value = 0; contrastSlider.value = 0; saturationSlider.value = 0;
                        grayscaleCheckbox.checked = false; sepiaCheckbox.checked = false; invertCheckbox.checked = false;
                        updateFilterValueDisplays();
                        updateExportControlsVisibility();

                        showMessage('Image loaded successfully!', 'success');
                    } catch (drawError) {
                        resetUIState();
                    } finally {
                        hideLoader();
                    }
                };
                originalImage.onerror = () => {
                    hideLoader();
                    showMessage('Error loading image data. The file might be corrupt or an unsupported format.', 'error');
                    resetUIState();
                }
                originalImage.src = e.target.result;
            };
            reader.onerror = () => {
                hideLoader();
                showMessage('Error reading file.', 'error');
                resetUIState();
            };
            reader.readAsDataURL(file);
        }
        
        function updateCropInputsFromRect() {
            cropXInput.value = Math.round(cropRect.x);
            cropYInput.value = Math.round(cropRect.y);
            cropWidthInput.value = Math.round(cropRect.width);
            cropHeightInput.value = Math.round(cropRect.height);
        }

        function updateRectFromCropInputs() {
            cropRect.x = parseInt(cropXInput.value) || 0;
            cropRect.y = parseInt(cropYInput.value) || 0;
            cropRect.width = parseInt(cropWidthInput.value) || (currentImage ? currentImage.width : 100);
            cropRect.height = parseInt(cropHeightInput.value) || (currentImage ? currentImage.height : 100);
            if (isInteractiveCropActive && currentImage) scheduleDrawCropSelection();
        }
        cropXInput.addEventListener('change', updateRectFromCropInputs);
        cropYInput.addEventListener('change', updateRectFromCropInputs);
        cropWidthInput.addEventListener('change', updateRectFromCropInputs);
        cropHeightInput.addEventListener('change', updateRectFromCropInputs);


        [resizeWidthInput, resizeHeightInput].forEach(input => {
            input.addEventListener('input', () => {
                if (!currentImage || !aspectRatioLock.checked || !input.value) return;
                const sourceImg = currentImage;
                const target = input.id === 'resizeWidth' ? resizeHeightInput : resizeWidthInput;
                const aspectRatio = sourceImg.width / sourceImg.height;

                if (target === resizeHeightInput) {
                    target.value = Math.round(input.value / aspectRatio) || '';
                } else {
                    target.value = Math.round(input.value * aspectRatio) || '';
                }
                if(resizeWidthInput.value && sourceImg.width > 0) {
                    resizePercentInput.value = Math.round((parseFloat(resizeWidthInput.value) / sourceImg.width) * 100) || '';
                } else {
                    resizePercentInput.value = '';
                }
            });
        });

        resizePercentInput.addEventListener('input', () => {
            if (!currentImage || !resizePercentInput.value) return;
            const percent = parseFloat(resizePercentInput.value);
            if (percent > 0 && currentImage.width > 0 && currentImage.height > 0) {
                resizeWidthInput.value = Math.round(currentImage.width * (percent / 100));
                resizeHeightInput.value = Math.round(currentImage.height * (percent / 100));
            } else {
                resizeWidthInput.value = '';
                resizeHeightInput.value = '';
            }
        });

        applyResizeBtn.addEventListener('click', async () => {
            if (!currentImage) { showMessage('No image loaded.', 'error'); return; }
            if (isInteractiveCropActive) deactivateInteractiveCropMode();

            const width = parseInt(resizeWidthInput.value);
            const height = parseInt(resizeHeightInput.value);

            if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
                showMessage('Invalid dimensions for resizing.', 'error'); return;
            }
            
            showLoader();
            const tempImg = new Image();
            tempImg.onload = async () => {
                try {
                    currentImage = tempImg;
                    await drawImageToCanvas(currentImage, currentFilters);
                    showMessage('Image resized.', 'success');
                    
                    cropRect.x = Math.max(0, Math.min(cropRect.x, currentImage.width - cropRect.width));
                    cropRect.y = Math.max(0, Math.min(cropRect.y, currentImage.height - cropRect.height));
                    cropRect.width = Math.min(cropRect.width, currentImage.width);
                    cropRect.height = Math.min(cropRect.height, currentImage.height);
                    updateCropInputsFromRect();

                } catch (e) { /* Handled */ }
                finally { hideLoader(); }
            };
            tempImg.onerror = () => { hideLoader(); showMessage('Error processing resize operation.', 'error'); };
            
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = width; tempCanvas.height = height;
            tempCtx.drawImage(currentImage, 0, 0, width, height);
            tempImg.src = tempCanvas.toDataURL(originalImage ? originalImage.type : 'image/png');
        });

        applyCropBtn.addEventListener('click', async () => {
            if (!currentImage) { showMessage('No image loaded.', 'error'); return; }
            
            const x = parseInt(cropXInput.value);
            const y = parseInt(cropYInput.value);
            const width = parseInt(cropWidthInput.value);
            const height = parseInt(cropHeightInput.value);

            if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
                showMessage('Invalid crop parameters.', 'error'); return;
            }
            if (x < 0 || y < 0 || x + width > currentImage.width || y + height > currentImage.height) {
                showMessage('Crop area is outside image bounds.', 'error'); return;
            }
            
            if (isInteractiveCropActive) deactivateInteractiveCropMode();
            showLoader();

            const tempImg = new Image();
            tempImg.onload = async () => {
                try {
                    currentImage = tempImg;
                    await drawImageToCanvas(currentImage, currentFilters);
                    showMessage('Image cropped.', 'success');
                    
                    resizeWidthInput.value = currentImage.width;
                    resizeHeightInput.value = currentImage.height;
                    resizePercentInput.value = 100;
                    
                    cropRect.x = Math.max(0, Math.round(currentImage.width * 0.1));
                    cropRect.y = Math.max(0, Math.round(currentImage.height * 0.1));
                    cropRect.width = Math.max(50, Math.round(currentImage.width * 0.8));
                    cropRect.height = Math.max(50, Math.round(currentImage.height * 0.8));
                    updateCropInputsFromRect();

                } catch (e) { /* Handled */ }
                finally { hideLoader(); }
            };
            tempImg.onerror = () => { hideLoader(); showMessage('Error processing crop operation.', 'error'); };

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = width; tempCanvas.height = height;
            tempCtx.drawImage(currentImage, x, y, width, height, 0, 0, width, height);
            tempImg.src = tempCanvas.toDataURL(originalImage ? originalImage.type : 'image/png');
        });
        
        async function applyTransformation(operation) {
            if (!currentImage) { showMessage('No image loaded.', 'error'); return; }
             if (isInteractiveCropActive) deactivateInteractiveCropMode();
            showLoader();
            
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            let newWidth = currentImage.width; let newHeight = currentImage.height;

            if (operation === 'rotateLeft' || operation === 'rotateRight') {
                newWidth = currentImage.height; newHeight = currentImage.width;
            }
            tempCanvas.width = newWidth; tempCanvas.height = newHeight;
            tempCtx.translate(newWidth / 2, newHeight / 2);

            switch (operation) {
                case 'rotateLeft': tempCtx.rotate(-90 * Math.PI / 180); break;
                case 'rotateRight': tempCtx.rotate(90 * Math.PI / 180); break;
                case 'flipHorizontal': tempCtx.scale(-1, 1); break;
                case 'flipVertical': tempCtx.scale(1, -1); break;
            }
            tempCtx.drawImage(currentImage, -currentImage.width / 2, -currentImage.height / 2);
            
            const tempImg = new Image();
            tempImg.onload = async () => {
                try {
                    currentImage = tempImg;
                    await drawImageToCanvas(currentImage, currentFilters);
                    showMessage(`Image ${operation.replace(/([A-Z])/g, ' $1').toLowerCase()}d.`, 'success');
                    resizeWidthInput.value = currentImage.width; resizeHeightInput.value = currentImage.height;
                    cropRect.x = Math.max(0, Math.round(currentImage.width * 0.1));
                    cropRect.y = Math.max(0, Math.round(currentImage.height * 0.1));
                    cropRect.width = Math.min(cropRect.width, currentImage.width);
                    cropRect.height = Math.min(cropRect.height, currentImage.height);
                    cropRect.width = Math.max(50, cropRect.width);
                    cropRect.height = Math.max(50, cropRect.height);
                    updateCropInputsFromRect();

                    resizePercentInput.value = 100;
                } catch (e) { /* Handled */ }
                finally { hideLoader(); }
            };
            tempImg.onerror = () => { hideLoader(); showMessage(`Error during ${operation}.`, 'error'); };
            tempImg.src = tempCanvas.toDataURL(originalImage ? originalImage.type : 'image/png');
        }

        rotateLeftBtn.addEventListener('click', () => applyTransformation('rotateLeft'));
        rotateRightBtn.addEventListener('click', () => applyTransformation('rotateRight'));
        flipHorizontalBtn.addEventListener('click', () => applyTransformation('flipHorizontal'));
        flipVerticalBtn.addEventListener('click', () => applyTransformation('flipVertical'));

        [brightnessSlider, contrastSlider, saturationSlider].forEach(slider => {
            slider.addEventListener('input', () => {
                updateFilterValueDisplays();
                if (currentImage) {
                    drawImageToCanvas(currentImage, {
                        brightness: parseInt(brightnessSlider.value),
                        contrast: parseInt(contrastSlider.value),
                        saturation: parseInt(saturationSlider.value),
                        grayscale: grayscaleCheckbox.checked,
                        sepia: sepiaCheckbox.checked,
                        invert: invertCheckbox.checked
                    }, () => { if (isInteractiveCropActive) scheduleDrawCropSelection(); });
                }
            });
        });
         [grayscaleCheckbox, sepiaCheckbox, invertCheckbox].forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                 if (currentImage) {
                    drawImageToCanvas(currentImage, {
                        brightness: parseInt(brightnessSlider.value),
                        contrast: parseInt(contrastSlider.value),
                        saturation: parseInt(saturationSlider.value),
                        grayscale: grayscaleCheckbox.checked,
                        sepia: sepiaCheckbox.checked,
                        invert: invertCheckbox.checked
                    }, () => { if (isInteractiveCropActive) scheduleDrawCropSelection(); });
                }
            });
        });

        applyFiltersBtn.addEventListener('click', async () => {
            if (!currentImage) { showMessage('No image loaded.', 'error'); return; }
            currentFilters.brightness = parseInt(brightnessSlider.value);
            currentFilters.contrast = parseInt(contrastSlider.value);
            currentFilters.saturation = parseInt(saturationSlider.value);
            currentFilters.grayscale = grayscaleCheckbox.checked;
            currentFilters.sepia = sepiaCheckbox.checked;
            currentFilters.invert = invertCheckbox.checked;

            try {
                await drawImageToCanvas(currentImage, currentFilters, () => {
                     if (isInteractiveCropActive) scheduleDrawCropSelection();
                });
                showMessage('Adjustments applied and saved to current view.', 'success');
            } catch(e) { /* Handled */ }
        });

        function updateExportControlsVisibility() {
            const format = outputFormatSelect.value;
            const isLossyFormat = format === 'image/jpeg' || format === 'image/webp';
            qualitySliderContainer.style.display = isLossyFormat ? 'block' : 'none';
            targetFileSizeContainer.style.display = 'block';
            downloadBySizeButton.style.display = 'inline-flex';
        }

        outputFormatSelect.addEventListener('change', updateExportControlsVisibility);
        outputQualitySlider.addEventListener('input', () => {
            qualityValueEl.textContent = parseFloat(outputQualitySlider.value).toFixed(2);
        });

        downloadButton.addEventListener('click', () => {
            if (!currentImage) { showMessage('No image to download.', 'error'); return; }
             if (isInteractiveCropActive) deactivateInteractiveCropMode();
            showLoader();
            const format = outputFormatSelect.value;
            const quality = parseFloat(outputQualitySlider.value);
            const finalFileName = `${originalFileName.split('.').slice(0, -1).join('.')}_edited.${format.split('/')[1]}`;

            const exportCanvas = document.createElement('canvas');
            const exportCtx = exportCanvas.getContext('2d');
            exportCanvas.width = currentImage.width;
            exportCanvas.height = currentImage.height;

            let filterString = '';
            Object.entries(currentFilters).forEach(([key, value]) => {
                if (value) {
                    if (key === 'brightness' && value !== 0) filterString += `brightness(${100 + value}%) `;
                    else if (key === 'contrast' && value !== 0) filterString += `contrast(${100 + value}%) `;
                    else if (key === 'saturation' && value !== 0) filterString += `saturate(${100 + value}%) `;
                    else if (key === 'grayscale' && value) filterString += `grayscale(100%) `;
                    else if (key === 'sepia' && value) filterString += `sepia(100%) `;
                    else if (key === 'invert' && value) filterString += `invert(100%) `;
                }
            });
            
            exportCtx.filter = filterString.trim();
            exportCtx.drawImage(currentImage, 0, 0, currentImage.width, currentImage.height);

            const dataUrl = exportCanvas.toDataURL(format, (format === 'image/png' ? undefined : quality));
            const link = document.createElement('a');
            link.href = dataUrl; link.download = finalFileName;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            hideLoader();
            showMessage('Image download started (manual settings).', 'success');
        });

        function getCanvasBlob(canvas, format, quality) {
            return new Promise((resolve, reject) => {
                try {
                    canvas.toBlob(blob => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas to Blob conversion failed (null blob)'));
                    }, format, quality);
                } catch (error) { reject(error); }
            });
        }

        downloadBySizeButton.addEventListener('click', async () => {
            if (!currentImage) { showMessage('No image loaded.', 'error'); return; }
            if (isInteractiveCropActive) deactivateInteractiveCropMode();

            const targetSizeKBText = targetFileSizeInput.value;
            if (!targetSizeKBText) {
                showMessage('Please enter a target file size in KB.', 'error'); return;
            }
            const targetSizeKB = parseFloat(targetSizeKBText);
            if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
                showMessage('Invalid target file size.', 'error'); return;
            }
            const targetSizeBytes = targetSizeKB * 1024;
            const outputFormat = outputFormatSelect.value;

            showLoader();

            let bestBlob = null;
            let bestQuality = outputFormat === 'image/png' ? 1 : -1;
            let bestWidth = currentImage.width;
            let bestHeight = currentImage.height;
            
            let currentTryWidth = currentImage.width;
            let currentTryHeight = currentImage.height;
            const sourceImageForTargeting = currentImage;
            const originalAspectRatio = sourceImageForTargeting.width / sourceImageForTargeting.height;

            const maxIterationsTotal = 30;
            let iterationCount = 0;
            const minDimension = 50;

            if (outputFormat === 'image/jpeg' || outputFormat === 'image/webp') {
                for (let q = 1.0; q >= 0.05; q -= 0.05) {
                    iterationCount++;
                    if(iterationCount > maxIterationsTotal) break;

                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = currentTryWidth; tempCanvas.height = currentTryHeight;
                    
                    let filterString = '';
                    Object.entries(currentFilters).forEach(([key, value]) => {
                      if (value) { if (key === 'brightness' && value !== 0) filterString += `brightness(${100 + value}%) `; else if (key === 'contrast' && value !== 0) filterString += `contrast(${100 + value}%) `; else if (key === 'saturation' && value !== 0) filterString += `saturate(${100 + value}%) `; else if (key === 'grayscale' && value) filterString += `grayscale(100%) `; else if (key === 'sepia' && value) filterString += `sepia(100%) `; else if (key === 'invert' && value) filterString += `invert(100%) `; }
                    });
                    tempCtx.filter = filterString.trim();
                    tempCtx.drawImage(sourceImageForTargeting, 0, 0, currentTryWidth, currentTryHeight);

                    try {
                        const blob = await getCanvasBlob(tempCanvas, outputFormat, q);
                        if (!bestBlob || (blob.size <= targetSizeBytes && blob.size > (bestBlob && bestBlob.size > targetSizeBytes ? -1 : (bestBlob ? bestBlob.size : -1) )) || (blob.size > targetSizeBytes && blob.size < (bestBlob ? bestBlob.size : Infinity)) ) {
                            bestBlob = blob; bestQuality = q; bestWidth = currentTryWidth; bestHeight = currentTryHeight;
                        }
                        if (blob.size <= targetSizeBytes && blob.size >= targetSizeBytes * 0.9) break;
                    } catch (e) { console.error('Blob creation error (JPEG/WEBP quality loop):', e); break; }
                    if (q <= 0.06 && bestBlob && bestBlob.size > targetSizeBytes) break;
                }
                
                if (bestBlob && bestBlob.size > targetSizeBytes * 1.05 && iterationCount < maxIterationsTotal) {
                    const prevBestBlobForDimReduction = bestBlob;
                    const prevBestQualityForDimReduction = bestQuality;
                    const prevBestWidthForDimReduction = bestWidth;
                    const prevBestHeightForDimReduction = bestHeight;

                    currentTryWidth = Math.max(minDimension, Math.round(sourceImageForTargeting.width * 0.85));
                    currentTryHeight = Math.max(minDimension, Math.round(currentTryWidth / originalAspectRatio));

                    if (currentTryWidth >= minDimension && currentTryHeight >= minDimension) {
                        for (let q = 1.0; q >= 0.05; q -= 0.05) {
                            iterationCount++;
                            if(iterationCount > maxIterationsTotal) break;
                            
                            const tempCanvas = document.createElement('canvas');
                            const tempCtx = tempCanvas.getContext('2d');
                            tempCanvas.width = currentTryWidth; tempCanvas.height = currentTryHeight;
                            let filterString = '';
                            Object.entries(currentFilters).forEach(([key, value]) => {
                              if (value) { if (key === 'brightness' && value !== 0) filterString += `brightness(${100 + value}%) `; else if (key === 'contrast' && value !== 0) filterString += `contrast(${100 + value}%) `; else if (key === 'saturation' && value !== 0) filterString += `saturate(${100 + value}%) `; else if (key === 'grayscale' && value) filterString += `grayscale(100%) `; else if (key === 'sepia' && value) filterString += `sepia(100%) `; else if (key === 'invert' && value) filterString += `invert(100%) `; }
                            });
                            tempCtx.filter = filterString.trim();
                            tempCtx.drawImage(sourceImageForTargeting, 0, 0, currentTryWidth, currentTryHeight);

                            try {
                                const blob = await getCanvasBlob(tempCanvas, outputFormat, q);
                                if (!bestBlob || (blob.size <= targetSizeBytes && blob.size > (bestBlob && bestBlob.size > targetSizeBytes ? -1 : (bestBlob ? bestBlob.size : -1))) || (blob.size > targetSizeBytes && blob.size < (bestBlob ? bestBlob.size : Infinity)) ) {
                                   bestBlob = blob; bestQuality = q; bestWidth = currentTryWidth; bestHeight = currentTryHeight;
                                }
                                if (blob.size <= targetSizeBytes && blob.size >= targetSizeBytes * 0.9) break;
                            } catch (e) { console.error('Blob creation error (JPEG/WEBP dim reduction loop):', e); break; }
                            if (q <= 0.06 && bestBlob && bestBlob.size > targetSizeBytes) break;
                        }
                    }
                    if(bestBlob && prevBestBlobForDimReduction && bestBlob.size < targetSizeBytes * 0.5 && prevBestBlobForDimReduction.size < targetSizeBytes *1.5) {
                        if(Math.abs(prevBestBlobForDimReduction.size - targetSizeBytes) < Math.abs(bestBlob.size - targetSizeBytes)){
                            bestBlob = prevBestBlobForDimReduction; bestQuality = prevBestQualityForDimReduction;
                            bestWidth = prevBestWidthForDimReduction; bestHeight = prevBestHeightForDimReduction;
                        }
                    }
                }
            } else if (outputFormat === 'image/png') {
                let scale = 1.0;
                const scaleStep = 0.05;

                for (let i = 0; i < maxIterationsTotal; i++) {
                    iterationCount++;
                    currentTryWidth = Math.max(minDimension, Math.round(sourceImageForTargeting.width * scale));
                    currentTryHeight = Math.max(minDimension, Math.round(currentTryWidth / originalAspectRatio));
                    
                    if (currentTryWidth < minDimension || currentTryHeight < minDimension && scale < 1.0) {
                        break;
                    }

                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = currentTryWidth; tempCanvas.height = currentTryHeight;
                    
                    let filterString = '';
                    Object.entries(currentFilters).forEach(([key, value]) => {
                      if (value) { if (key === 'brightness' && value !== 0) filterString += `brightness(${100 + value}%) `; else if (key === 'contrast' && value !== 0) filterString += `contrast(${100 + value}%) `; else if (key === 'saturation' && value !== 0) filterString += `saturate(${100 + value}%) `; else if (key === 'grayscale' && value) filterString += `grayscale(100%) `; else if (key === 'sepia' && value) filterString += `sepia(100%) `; else if (key === 'invert' && value) filterString += `invert(100%) `; }
                    });
                    tempCtx.filter = filterString.trim();
                    tempCtx.drawImage(sourceImageForTargeting, 0, 0, currentTryWidth, currentTryHeight);

                    try {
                        const blob = await getCanvasBlob(tempCanvas, outputFormat, 1.0);
                        if (!bestBlob ||
                            (blob.size <= targetSizeBytes && (!bestBlob || blob.size > bestBlob.size || bestBlob.size > targetSizeBytes)) ||
                            (blob.size > targetSizeBytes && (!bestBlob || blob.size < bestBlob.size))) {
                            bestBlob = blob; bestWidth = currentTryWidth; bestHeight = currentTryHeight;
                            bestQuality = 1.0;
                        }

                        if (blob.size <= targetSizeBytes && blob.size >= targetSizeBytes * 0.95) break;
                        if (blob.size < targetSizeBytes && scale === 1.0) break;
                        if (blob.size < targetSizeBytes * 0.5 && bestBlob && bestBlob.size > targetSizeBytes) {
                        }

                    } catch (e) { console.error('Blob creation error (PNG loop):', e); break; }
                                        
                    scale -= scaleStep;
                    if (scale <= 0.05) break;
                }
            }

            hideLoader();
            if (bestBlob) {
                const finalFileName = `${originalFileName.split('.').slice(0, -1).join('.')}_target_${targetSizeKB}KB.${outputFormat.split('/')[1]}`;
                const link = document.createElement('a');
                link.href = URL.createObjectURL(bestBlob);
                link.download = finalFileName;
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                
                let qualityMessage = outputFormat === 'image/png' ? "N/A (Lossless)" : bestQuality.toFixed(2);
                showMessage(`Target size download: Achieved ${(bestBlob.size / 1024).toFixed(2)} KB (Target: ${targetSizeKB} KB). Quality: ${qualityMessage}. Dimensions: ${bestWidth}x${bestHeight}px.`, 'success', 8000);
            } else {
                showMessage('Could not effectively meet target file size. Try adjusting target, image dimensions, or format.', 'error', 6000);
            }
        });

        resetButton.addEventListener('click', async () => {
            if (!originalImage) { showMessage('No original image to reset to.', 'error'); return; }
             if (isInteractiveCropActive) deactivateInteractiveCropMode();
            showLoader();
            const newOriginalStateImg = new Image();
            newOriginalStateImg.type = originalImage.type;
            newOriginalStateImg.onload = async () => {
                currentImage = newOriginalStateImg;
                resetCurrentFilters();
                brightnessSlider.value = 0; contrastSlider.value = 0; saturationSlider.value = 0;
                grayscaleCheckbox.checked = false; sepiaCheckbox.checked = false; invertCheckbox.checked = false;
                updateFilterValueDisplays();

                try {
                    await drawImageToCanvas(currentImage, currentFilters, () => {
                        if (isInteractiveCropActive) scheduleDrawCropSelection();
                    });
                    resizeWidthInput.value = currentImage.width; resizeHeightInput.value = currentImage.height;
                    resizePercentInput.value = 100;
                    
                    cropRect.x = Math.max(0, Math.round(currentImage.width * 0.1));
                    cropRect.y = Math.max(0, Math.round(currentImage.height * 0.1));
                    cropRect.width = Math.max(50, Math.round(currentImage.width * 0.8));
                    cropRect.height = Math.max(50, Math.round(currentImage.height * 0.8));
                    updateCropInputsFromRect();

                    showMessage('Image reset to original state.', 'success');
                } catch(e) { /* Handled */ }
                finally { hideLoader(); }
            };
            newOriginalStateImg.onerror = () => {
                 hideLoader();
                 showMessage('Error resetting image to original.', 'error');
            }
            newOriginalStateImg.src = originalImage.src;
        });

        clearButton.addEventListener('click', () => {
            resetUIState();
            showMessage('Workspace cleared.', 'success');
        });

        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false');});
                e.currentTarget.classList.add('active');
                e.currentTarget.setAttribute('aria-selected', 'true');
                const targetTabContentId = e.currentTarget.dataset.tab;
                tabContents.forEach(tc => {
                    tc.classList.remove('active');
                    if (tc.id === targetTabContentId + "Panel") {
                        tc.classList.add('active');
                    }
                });
                if (isInteractiveCropActive && targetTabContentId !== "transformTab") {
                    deactivateInteractiveCropMode();
                }
            });
        });
        
        toggleInteractiveCropBtn.addEventListener('click', () => {
            if (!currentImage) {
                showMessage('Please load an image first to use interactive crop.', 'warning');
                return;
            }
            if (isInteractiveCropActive) {
                deactivateInteractiveCropMode();
            } else {
                activateInteractiveCropMode();
            }
        });

        function activateInteractiveCropMode() {
            isInteractiveCropActive = true;
            toggleInteractiveCropBtn.innerHTML = '<i class="fas fa-times mr-2"></i>Disable Interactive Crop';
            toggleInteractiveCropBtn.classList.replace('btn-secondary', 'btn-danger');
            imagePreviewArea.classList.add('cropping-active');
            cropCanvasOverlay.style.pointerEvents = 'auto';
            
            cropRect.x = Math.max(0, Math.min(cropRect.x, currentImage.width - cropRect.width));
            cropRect.y = Math.max(0, Math.min(cropRect.y, currentImage.height - cropRect.height));
            cropRect.width = Math.min(cropRect.width, currentImage.width - cropRect.x);
            cropRect.height = Math.min(cropRect.height, currentImage.height - cropRect.y);
            cropRect.width = Math.max(10, cropRect.width);
            cropRect.height = Math.max(10, cropRect.height);

            updateCropInputsFromRect();
            scheduleDrawCropSelection();
        }

        function deactivateInteractiveCropMode() {
            isInteractiveCropActive = false;
            toggleInteractiveCropBtn.innerHTML = '<i class="fas fa-mouse-pointer mr-2"></i>Enable Interactive Crop';
            toggleInteractiveCropBtn.classList.replace('btn-danger', 'btn-secondary');
            imagePreviewArea.classList.remove('cropping-active');
            imagePreviewArea.style.cursor = 'default';
            cropCanvasOverlay.style.pointerEvents = 'none';
            if (cropSelectionRafId) {
                cancelAnimationFrame(cropSelectionRafId);
                cropSelectionRafId = null;
            }
            cropCtx.clearRect(0, 0, cropCanvasOverlay.width, cropCanvasOverlay.height);
        }
        
        function scheduleDrawCropSelection() {
            if (cropSelectionRafId) {
                cancelAnimationFrame(cropSelectionRafId);
            }
            cropSelectionRafId = requestAnimationFrame(() => {
                drawCropSelection();
                cropSelectionRafId = null;
            });
        }

        function drawCropSelection() {
            if (!currentImage || !isInteractiveCropActive) return;

            cropCtx.clearRect(0, 0, cropCanvasOverlay.width, cropCanvasOverlay.height);
            cropCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            cropCtx.fillRect(0, 0, cropCanvasOverlay.width, cropCanvasOverlay.height);
            cropCtx.clearRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

            cropCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            cropCtx.lineWidth = 1;
            cropCtx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

            cropCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            const handles = getResizeHandles();
            for (const handleName in handles) {
                const handle = handles[handleName];
                cropCtx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            }
        }

        function getResizeHandles() {
            return {
                topLeft: { x: cropRect.x, y: cropRect.y },
                topRight: { x: cropRect.x + cropRect.width, y: cropRect.y },
                bottomLeft: { x: cropRect.x, y: cropRect.y + cropRect.height },
                bottomRight: { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height },
                top: { x: cropRect.x + cropRect.width / 2, y: cropRect.y },
                bottom: { x: cropRect.x + cropRect.width / 2, y: cropRect.y + cropRect.height },
                left: { x: cropRect.x, y: cropRect.y + cropRect.height / 2 },
                right: { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height / 2 },
            };
        }

        function getMousePos(canvas, evt) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const clientX = evt.clientX !== undefined ? evt.clientX : evt.touches[0].clientX;
            const clientY = evt.clientY !== undefined ? evt.clientY : evt.touches[0].clientY;

            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        }

        cropCanvasOverlay.addEventListener('mousedown', handleCropMouseDown);
        cropCanvasOverlay.addEventListener('touchstart', handleCropMouseDown, { passive: false });

        function handleCropMouseDown(e) {
            if (!isInteractiveCropActive || !currentImage) return;
            e.preventDefault();

            const mousePos = getMousePos(cropCanvasOverlay, e);
            dragStartX = mousePos.x;
            dragStartY = mousePos.y;

            const handles = getResizeHandles();
            isResizingCropRect = false;
            for (const handleName in handles) {
                const handle = handles[handleName];
                if (mousePos.x >= handle.x - handleSize && mousePos.x <= handle.x + handleSize &&
                    mousePos.y >= handle.y - handleSize && mousePos.y <= handle.y + handleSize) {
                    isResizingCropRect = true;
                    resizeHandle = handleName;
                    imagePreviewArea.style.cursor = getResizeCursor(handleName);
                    break;
                }
            }

            if (!isResizingCropRect &&
                mousePos.x >= cropRect.x && mousePos.x <= cropRect.x + cropRect.width &&
                mousePos.y >= cropRect.y && mousePos.y <= cropRect.y + cropRect.height) {
                isDraggingCropRect = true;
                imagePreviewArea.style.cursor = 'move';
            }
            
            if(isResizingCropRect || isDraggingCropRect){
                document.addEventListener('mousemove', handleCropMouseMove);
                document.addEventListener('mouseup', handleCropMouseUp);
                document.addEventListener('touchmove', handleCropMouseMove, { passive: false });
                document.addEventListener('touchend', handleCropMouseUp);
            }
        }
        
        function getResizeCursor(handle) {
            if (handle.includes('top') && handle.includes('Left')) return 'nwse-resize';
            if (handle.includes('top') && handle.includes('Right')) return 'nesw-resize';
            if (handle.includes('bottom') && handle.includes('Left')) return 'nesw-resize';
            if (handle.includes('bottom') && handle.includes('Right')) return 'nwse-resize';
            if (handle.includes('top') || handle.includes('bottom')) return 'ns-resize';
            if (handle.includes('left') || handle.includes('right')) return 'ew-resize';
            return 'default';
        }


        function handleCropMouseMove(e) {
            if (!isInteractiveCropActive || !currentImage) return;
            e.preventDefault();

            const mousePos = getMousePos(cropCanvasOverlay, e);
            const dx = mousePos.x - dragStartX;
            const dy = mousePos.y - dragStartY;

            let newX = cropRect.x, newY = cropRect.y, newWidth = cropRect.width, newHeight = cropRect.height;

            if (isResizingCropRect) {
                imagePreviewArea.style.cursor = getResizeCursor(resizeHandle);
                if (resizeHandle.includes('Left')) { newX += dx; newWidth -= dx; }
                if (resizeHandle.includes('Right')) { newWidth += dx; }
                if (resizeHandle.includes('top')) { newY += dy; newHeight -= dy; }
                if (resizeHandle.includes('bottom')) { newHeight += dy; }

                if (newWidth < 2 * handleSize) {
                    if (resizeHandle.includes('Left')) newX = cropRect.x + cropRect.width - (2*handleSize);
                    newWidth = 2 * handleSize;
                }
                if (newHeight < 2 * handleSize) {
                    if (resizeHandle.includes('top')) newY = cropRect.y + cropRect.height - (2*handleSize);
                    newHeight = 2 * handleSize;
                }

            } else if (isDraggingCropRect) {
                imagePreviewArea.style.cursor = 'move';
                newX += dx;
                newY += dy;
            } else {
                let onHandle = false;
                const handles = getResizeHandles();
                for (const handleName in handles) {
                    const handle = handles[handleName];
                    if (mousePos.x >= handle.x - handleSize && mousePos.x <= handle.x + handleSize &&
                        mousePos.y >= handle.y - handleSize && mousePos.y <= handle.y + handleSize) {
                        imagePreviewArea.style.cursor = getResizeCursor(handleName);
                        onHandle = true;
                        break;
                    }
                }
                if (!onHandle) {
                     if (mousePos.x >= cropRect.x && mousePos.x <= cropRect.x + cropRect.width &&
                         mousePos.y >= cropRect.y && mousePos.y <= cropRect.y + cropRect.height) {
                        imagePreviewArea.style.cursor = 'move';
                    } else {
                        imagePreviewArea.style.cursor = 'crosshair';
                    }
                }
                return;
            }
            
            cropRect.x = Math.max(0, Math.min(newX, cropCanvasOverlay.width - newWidth));
            cropRect.y = Math.max(0, Math.min(newY, cropCanvasOverlay.height - newHeight));
            cropRect.width = Math.max(2 * handleSize, Math.min(newWidth, cropCanvasOverlay.width - cropRect.x));
            cropRect.height = Math.max(2 * handleSize, Math.min(newHeight, cropCanvasOverlay.height - cropRect.y));


            dragStartX = mousePos.x;
            dragStartY = mousePos.y;

            updateCropInputsFromRect();
            scheduleDrawCropSelection();
        }

        function handleCropMouseUp() {
            isDraggingCropRect = false;
            isResizingCropRect = false;
            resizeHandle = '';
            imagePreviewArea.style.cursor = isInteractiveCropActive ? 'crosshair' : 'default';

            document.removeEventListener('mousemove', handleCropMouseMove);
            document.removeEventListener('mouseup', handleCropMouseUp);
            document.removeEventListener('touchmove', handleCropMouseMove);
            document.removeEventListener('touchend', handleCropMouseUp);
        }
        
        cropCanvasOverlay.addEventListener('mousemove', (e) => {
            if (isInteractiveCropActive && !isDraggingCropRect && !isResizingCropRect) {
                handleCropMouseMove(e);
            }
        });


        resetUIState();
    });