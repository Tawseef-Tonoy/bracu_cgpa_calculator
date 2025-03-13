from flask import Flask, request, jsonify, render_template
import os
import json
from datetime import datetime

app = Flask(__name__, static_folder='static', template_folder='templates')

# Grading scale for BRAC University
GRADE_SCALE = {
    'A': 4.00, 'A-': 3.70, 'B+': 3.30,
    'B': 3.00, 'B-': 2.70, 'C+': 2.30, 'C': 2.00,
    'C-': 1.70, 'D+': 1.30, 'D': 1.00, 'F': 0.00
}

# Helper function to get letter grade from GPA
def get_letter_grade(gpa):
    for grade, value in GRADE_SCALE.items():
        if gpa >= value:
            return grade
    return 'F'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """
    API endpoint to calculate GPA and CGPA
    """
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    results = {}
    total_credits = 0
    total_points = 0

    for semester_key, courses in data.items():
        semester_credits = 0
        semester_points = 0

        for course in courses:
            credit = float(course.get('credit', 0))
            received_grade = float(course.get('receivedGrade', 0))

            if credit > 0 and received_grade > 0:
                semester_credits += credit
                semester_points += credit * received_grade

        semester_gpa = semester_points / semester_credits if semester_credits > 0 else 0
        results[semester_key] = {
            'credits': semester_credits,
            'gpa': round(semester_gpa, 2),
            'letterGrade': get_letter_grade(semester_gpa),
        }

        total_credits += semester_credits
        total_points += semester_points

    cgpa = total_points / total_credits if total_credits > 0 else 0
    results['cumulative'] = {
        'totalCredits': total_credits,
        'cgpa': round(cgpa, 2),
        'letterGrade': get_letter_grade(cgpa),
    }

    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
