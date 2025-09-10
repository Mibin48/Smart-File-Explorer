// renderer.js - Frontend Logic
window.addEventListener('DOMContentLoaded', () => {
  const pathInput = document.getElementById('pathInput');
  const loadBtn = document.getElementById('loadBtn');
  const filesContainer = document.getElementById('files');

  // Render files into list
  function renderFiles(files) {
    filesContainer.innerHTML = '';

    if (files.error) {
      filesContainer.innerHTML = `<li class="text-red-500 p-2">Error: ${files.error}</li>`;
      return;
    }

    files.forEach(file => {
      const li = document.createElement('li');
      li.className = 'file-item grid grid-cols-12 items-center py-2 px-4 rounded cursor-pointer';

      // Icon selection
      let iconClass = file.isDirectory ? 'fa-folder text-blue-400' : 'fa-file text-gray-400';

      li.innerHTML = `
        <div class="col-span-6 flex items-center">
          <i class="fas ${iconClass} mr-2"></i>
          <span class="text-sm truncate">${file.name}</span>
        </div>
        <div class="col-span-2 text-xs text-gray-500">${file.modified}</div>
        <div class="col-span-2 text-xs text-gray-500">${file.type}</div>
        <div class="col-span-2 text-xs text-gray-500">${file.size}</div>
      `;

      li.addEventListener('click', () => {
        document.querySelectorAll('.file-item.selected').forEach(item => item.classList.remove('selected'));
        li.classList.add('selected');

        if (file.isDirectory) {
          // Double click to navigate into folder
          li.ondblclick = async () => {
            pathInput.value = file.fullPath;
            const subFiles = await window.electronAPI.readDir(file.fullPath);
            renderFiles(subFiles);
          };
        }
      });

      filesContainer.appendChild(li);
    });
  }

  // Load button handler
  loadBtn.addEventListener('click', async () => {
    const dirPath = pathInput.value || process.env.HOME || process.env.USERPROFILE;
    const files = await window.electronAPI.readDir(dirPath);
    renderFiles(files);
  });

  // Auto-load home directory
  (async () => {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    pathInput.value = homeDir;
    const files = await window.electronAPI.readDir(homeDir);
    renderFiles(files);
  })();
});
