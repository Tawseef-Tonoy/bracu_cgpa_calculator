// Grade to Point Mapping
const gradeToPoint = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'F': 0.0
};

// Grade ranges for letter grades (exact GPA/CGPA mapping)
const gradeRanges = [
    { min: 3.7, max: 4.0, letter: 'A' },
    { min: 3.3, max: 3.69, letter: 'B+' },
    { min: 3.0, max: 3.29, letter: 'B' },
    { min: 2.7, max: 2.99, letter: 'B-' },
    { min: 2.3, max: 2.69, letter: 'C+' },
    { min: 2.0, max: 2.29, letter: 'C' },
    { min: 1.7, max: 1.99, letter: 'C-' },
    { min: 1.3, max: 1.69, letter: 'D+' },
    { min: 1.0, max: 1.29, letter: 'D' },
    { min: 0.0, max: 0.99, letter: 'F' }
];

// Get letter grade from GPA/CGPA based on exact value
function getLetterGrade(gpa) {
    const numGPA = parseFloat(gpa);
    if (isNaN(numGPA)) return '-';

    for (let range of gradeRanges) {
        if (numGPA >= range.min && numGPA <= range.max) {
            return range.letter;
        }
    }
    return 'F'; // Default if below 0.0 (shouldn't happen)
}

// Convert letter grade to numeric grade point
function getGradePoint(grade) {
    const upperGrade = grade.trim().toUpperCase();
    return gradeToPoint[upperGrade] !== undefined ? gradeToPoint[upperGrade] : 0.0;
}

// Parse Gradesheet and Fill Tables
document.getElementById('paste-btn').addEventListener('click', function() {
    let textData = document.getElementById('gradesheet-input').value.trim();
    if (!textData) {
        alert("Please paste your gradesheet first!");
        return;
    }

    const courseData = parseTranscript(textData);
    fillTable(courseData);
    calculateAll();
});

function parseTranscript(text) {
    let semesters = {};
    let currentSemester = null;
    let courseRecords = {};
    let semesterCount = 0;

    let lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line.startsWith("SEMESTER:")) {
            semesterCount++;
            let semesterKey = `sem${semesterCount}`;
            semesters[semesterKey] = [];
            currentSemester = semesterKey;
        } 
        else if (currentSemester && /^[A-Z]{3}\d{3}/.test(line)) {
            let fullLine = line;
            let j = i + 1;
            
            while (j < lines.length && 
                  !(/^[A-Z]{3}\d{3}/.test(lines[j])) && 
                  !lines[j].startsWith("SEMESTER") && 
                  !lines[j].includes("Credits Attempted")) {
                fullLine += " " + lines[j].trim();
                j++;
            }
            i = j - 1;
            
            const parsedCourse = parseCourseData(fullLine);
            if (parsedCourse) {
                const courseId = parsedCourse.courseId;
                
                if (!courseRecords[courseId] || 
                    parsedCourse.remarks?.includes("RP") || 
                    semesterCount > parseInt(courseRecords[courseId].semester.replace('sem', ''))) {
                    courseRecords[courseId] = {
                        ...parsedCourse,
                        semester: currentSemester
                    };
                }
            }
        }
    }

    for (let courseId in courseRecords) {
        let course = courseRecords[courseId];
        semesters[course.semester].push(course);
    }

    return semesters;
}

function parseCourseData(line) {
    const parts = line.split(/\s+/);
    if (parts.length < 5) return null;
    
    const courseId = parts[0];
    
    let i = parts.length - 1;
    const gradePoints = parseFloat(parts[i]);
    const receivedGrade = isNaN(gradePoints) ? parts[i] : gradePoints.toString(); // Handle both numeric and letter grades
    
    i--;
    let grade = parts[i];
    let remarks = "";
    
    if (i > 0 && parts[i-1].startsWith("(") && parts[i-1].endsWith(")")) {
        remarks = parts[i-1];
        i--;
    }
    
    i--;
    const credit = parseFloat(parts[i]);
    if (isNaN(credit)) return null;
    
    return {
        courseId,
        credit,
        receivedGrade: receivedGrade, // Store as entered (letter or number)
        letterGrade: grade,
        remarks
    };
}

function fillTable(semesters) {
    document.querySelectorAll('.semester').forEach((semester, index) => {
        let semesterKey = `sem${index + 1}`;
        let tbody = semester.querySelector('tbody');
        tbody.innerHTML = '';

        if (semesters[semesterKey]) {
            semesters[semesterKey].forEach(course => {
                let row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="text" class="course-id" value="${course.courseId}"></td>
                    <td><input type="number" class="credit" value="${course.credit}" min="0" max="5" step="0.5"></td>
                    <td><input type="text" class="received-grade" value="${course.receivedGrade}"></td>
                `;
                tbody.appendChild(row);
            });
        }
        
        while (tbody.children.length < 4) {
            addEmptyRow(tbody);
        }
        
        attachInputListeners(tbody);
    });
}

function addEmptyRow(tbody) {
    let row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="course-id"></td>
        <td><input type="number" class="credit" min="0" max="5" step="0.5"></td>
        <td><input type="text" class="received-grade"></td>
    `;
    tbody.appendChild(row);
}

// Add Row Functionality
document.querySelectorAll('.add-row').forEach(button => {
    button.addEventListener('click', function() {
        let semester = this.getAttribute('data-semester');
        let tbody = document.getElementById(`sem${semester}-body`);
        addEmptyRow(tbody);
        attachInputListeners(tbody);
    });
});

// Real-time Calculation
function attachInputListeners(tbody) {
    tbody.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', calculateAll);
    });
}

function calculateSemester(semesterIndex) {
    let tbody = document.getElementById(`sem${semesterIndex}-body`);
    let totalCredits = 0, totalPoints = 0, finishedCourses = 0;

    tbody.querySelectorAll('tr').forEach(row => {
        let credit = parseFloat(row.querySelector('.credit').value) || 0;
        let gradeInput = row.querySelector('.received-grade').value.trim();
        let gradePoint = !isNaN(parseFloat(gradeInput)) ? parseFloat(gradeInput) : getGradePoint(gradeInput);
        
        if (credit > 0 && gradePoint !== undefined) {
            totalCredits += credit;
            totalPoints += credit * gradePoint;
            finishedCourses++;
        }
    });

    let gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    document.getElementById(`sem${semesterIndex}-finished`).textContent = finishedCourses;
    document.getElementById(`sem${semesterIndex}-gpa`).textContent = gpa;
    document.getElementById(`sem${semesterIndex}-grade`).textContent = getLetterGrade(gpa);
    
    return { credits: totalCredits, points: totalPoints };
}

function calculateAll() {
    let totalCredits = 0, totalPoints = 0;
    let totalSemesters = document.querySelectorAll('.semester').length;
    
    for (let i = 1; i <= totalSemesters; i++) {
        let result = calculateSemester(i);
        totalCredits += result.credits;
        totalPoints += result.points;
    }

    let cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    document.getElementById('total-credits').textContent = totalCredits.toFixed(2);
    document.getElementById('final-cgpa').textContent = cgpa;
    document.getElementById('final-grade').textContent = getLetterGrade(cgpa);
}

// Reset Functionality
document.getElementById('reset-btn').addEventListener('click', function() {
    document.querySelectorAll('.semester tbody').forEach(tbody => {
        tbody.innerHTML = '';
        for (let i = 0; i < 4; i++) addEmptyRow(tbody);
        attachInputListeners(tbody);
    });
    document.getElementById('gradesheet-input').value = '';
    calculateAll();
});

// Save Functionality
document.getElementById('save-btn').addEventListener('click', function() {
    let data = {};
    document.querySelectorAll('.semester').forEach((semester, index) => {
        let semesterKey = `sem${index + 1}`;
        data[semesterKey] = [];
        
        semester.querySelectorAll('tbody tr').forEach(row => {
            let courseId = row.querySelector('.course-id').value;
            let credit = row.querySelector('.credit').value;
            let grade = row.querySelector('.received-grade').value;
            
            if (courseId || credit || grade) {
                data[semesterKey].push({ courseId, credit, grade });
            }
        });
    });
    
    localStorage.setItem('cgpaData', JSON.stringify(data));
    alert('Data saved locally!');
});

// Load Saved Data
window.addEventListener('load', function() {
    let savedData = localStorage.getItem('cgpaData');
    if (savedData) {
        try {
            let data = JSON.parse(savedData);
            document.querySelectorAll('.semester').forEach((semester, index) => {
                let semesterKey = `sem${index + 1}`;
                let tbody = semester.querySelector('tbody');
                tbody.innerHTML = '';
                
                if (data[semesterKey]) {
                    data[semesterKey].forEach(course => {
                        let row = document.createElement('tr');
                        row.innerHTML = `
                            <td><input type="text" class="course-id" value="${course.courseId || ''}"></td>
                            <td><input type="number" class="credit" value="${course.credit || ''}" min="0" max="5" step="0.5"></td>
                            <td><input type="text" class="received-grade" value="${course.grade || ''}"></td>
                        `;
                        tbody.appendChild(row);
                    });
                }
                
                while (tbody.children.length < 4) addEmptyRow(tbody);
                attachInputListeners(tbody);
            });
            calculateAll();
        } catch (e) {
            console.error("Error loading saved data:", e);
            document.getElementById('reset-btn').click();
        }
    }
});

document.getElementById('calculate-all').addEventListener('click', calculateAll);