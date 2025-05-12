document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const columns = document.querySelectorAll('.kanban-column');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const errorMessageElement = document.getElementById('error-message'); // For displaying validation errors

    // Initialize confetti
    let myConfetti = null;
    if (typeof confetti !== 'undefined') {
        myConfetti = confetti.create(confettiCanvas, {
            resize: true,
            useWorker: true
        });
    } else {
        console.error("Confetti library is not loaded.");
    }


    // Initialize tasks array from localStorage or empty
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    /**
     * Creates a task card HTML element.
     * @param {object} task - The task object (e.g., {id, text, status}).
     * @returns {HTMLElement} The task card element.
     */
    function createTaskCard(task) {
        const card = document.createElement('div');
        card.classList.add('task-card', 'p-4', 'rounded-md', 'shadow-md', 'relative', 'dark:bg-slate-700', 'dark:border', 'dark:border-slate-600');
        card.setAttribute('draggable', 'true');
        card.dataset.id = task.id;
        card.dataset.status = task.status;

        const cardText = document.createElement('p');
        cardText.classList.add('text-slate-800', 'dark:text-slate-200', 'break-words');
        cardText.textContent = task.text;
        card.appendChild(cardText);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.classList.add(
            'delete-btn', 'absolute', 'top-1', 'right-2', 'text-red-500', 'hover:text-red-700',
            'dark:text-red-400', 'dark:hover:text-red-300',
            'font-bold', 'text-lg', 'leading-none', 'p-1'
        );
        deleteBtn.title = "Delete task";
        deleteBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent dragstart if clicking delete button
            deleteTask(task.id);
        };
        card.appendChild(deleteBtn);

        // Drag event listeners for the card
        card.addEventListener('dragstart', handleDragStart);
        return card;
    }

    function renderBoard() {
        columns.forEach(column => {
            column.querySelector('.tasks-container').innerHTML = '';
        });

        // Add tasks to their respective columns
        tasks.forEach(task => {
            const card = createTaskCard(task);
            const column = document.getElementById(`${task.status}-column`);
            if (column) {
                column.querySelector('.tasks-container').appendChild(card);
            } else {
                console.warn(`Column for status "${task.status}" not found. Task ID: ${task.id}`);
            }
        });
    }

    /**
     * @param {string} message - The error message to display.
     */
    function showErrorMessage(message) {
        if (!errorMessageElement) return;
        errorMessageElement.textContent = message;
        // Add class for styling if needed, e.g., visibility
        errorMessageElement.classList.remove('opacity-0'); 

        setTimeout(() => {
            errorMessageElement.textContent = '';
            // errorMessageElement.classList.add('opacity-0');
        }, 3000); // Clear message after 3 seconds
    }


    /**
     * Adds a new task to the 'todo' list.
     */
    function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText === '') {
            showErrorMessage("Task description cannot be empty!");
            taskInput.classList.add('border-red-500', 'ring-red-500', 'dark:border-red-400', 'dark:ring-red-400');
            taskInput.focus();
            return;
        }
        // Clear any previous error styling
        taskInput.classList.remove('border-red-500', 'ring-red-500', 'dark:border-red-400', 'dark:ring-red-400');
        errorMessageElement.textContent = '';


        const newTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More robust unique ID
            text: taskText,
            status: 'todo' // Default status
        };

        tasks.push(newTask);
        taskInput.value = ''; // Clear input field
        saveTasks();
        renderBoard();
        taskInput.focus(); // Return focus to input for quick adding
    }

    /**
     * Deletes a task by its ID.
     * @param {string} taskId
     */
    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasks();
        renderBoard();
    }


    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    let draggedItem = null;

    /**
     * Handles the start of a drag operation.
     * @param {DragEvent} e - The drag event.
     */
    function handleDragStart(e) {
        // Check if the event target is the delete button itself
        if (e.target.classList.contains('delete-btn')) {
            e.preventDefault(); // Prevent dragging if the delete button was the source
            return;
        }
        draggedItem = e.target.closest('.task-card'); // Ensure we get the card
        if (!draggedItem) return;

        // Add a slight delay to allow the browser to capture the drag image
        setTimeout(() => {
            if(draggedItem) draggedItem.style.opacity = '0.5';
        }, 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedItem.dataset.id); // Good practice
    }

    /**
     * Handles dragging over a potential drop zone.
     * @param {DragEvent} e - The drag event.
     */
    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        const column = e.target.closest('.kanban-column');
        if (column) {
            columns.forEach(col => col.classList.remove('drag-over'));
            column.classList.add('drag-over');
        }
    }

    /**
     * Handles leaving a potential drop zone.
     * @param {DragEvent} e - The drag event.
     */
    function handleDragLeave(e) {
        const column = e.target.closest('.kanban-column');
        if (column) {
            column.classList.remove('drag-over');
        }
    }

    /**
     * Handles the drop operation.
     * @param {DragEvent} e - The drag event.
     */
    function handleDrop(e) {
        e.preventDefault();
        const targetColumnElement = e.target.closest('.kanban-column');
        if (!targetColumnElement || !draggedItem) {
            if (draggedItem) draggedItem.style.opacity = '1'; // Reset opacity if drop is invalid
            columns.forEach(col => col.classList.remove('drag-over'));
            draggedItem = null;
            return;
        }

        const targetStatus = targetColumnElement.dataset.status;
        const taskId = draggedItem.dataset.id; // Or use e.dataTransfer.getData('text/plain')
        const originalStatus = draggedItem.dataset.status;

        // Update task status in the tasks array
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex > -1) {
            tasks[taskIndex].status = targetStatus;
            saveTasks();
            // No need to manually append, renderBoard will handle it
            // targetColumnElement.querySelector('.tasks-container').appendChild(draggedItem);
            // draggedItem.dataset.status = targetStatus; // Update status on the element too for consistency
        }

        // Clean up styles
        targetColumnElement.classList.remove('drag-over');
        if (draggedItem) {
            draggedItem.style.opacity = '1';
        }

        // Trigger confetti if task moved to 'done' and was not already 'done'
        if (targetStatus === 'done' && originalStatus !== 'done') {
            triggerConfetti();
        }
        
        renderBoard(); // Re-render the entire board to ensure correct placement and data attributes
        draggedItem = null; // Reset after successful drop
    }

    /**
     * Handles the end of a drag operation (fired on the source element).
     * @param {DragEvent} e - The drag event.
     */
    function handleDragEnd(e) {
        // Reset opacity if drag was cancelled or unsuccessful
        // draggedItem might be null if drop was successful and handled in handleDrop
        if (e.target && e.target.classList.contains('task-card')) {
            e.target.style.opacity = '1';
        }
        columns.forEach(col => col.classList.remove('drag-over'));
        draggedItem = null; // Ensure draggedItem is cleared
    }

    // --- Confetti Function ---
    /**
     * Triggers a confetti animation.
     */
    function triggerConfetti() {
        if (myConfetti) {
            myConfetti({
                particleCount: 180, // Slightly more particles
                spread: 100,        // Wider spread
                origin: { y: 0.5 }, // Centered vertically
                colors: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'] // Custom confetti colors
            });
        }
    }

    // --- Event Listeners ---
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', addTask);
    }
    if (taskInput) {
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }

    // Add drag and drop listeners to columns
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
    // Add dragend to the document to catch it even if dropped outside a valid target
    // This helps reset the state of the dragged item if it's not dropped on a valid target.
    document.addEventListener('dragend', handleDragEnd);

    // Render the board when the page loads
    renderBoard();
    if (taskInput) taskInput.focus(); // Focus on input field on load
});
