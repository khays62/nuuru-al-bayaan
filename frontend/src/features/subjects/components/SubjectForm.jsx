import React, { useState, useEffect } from 'react';
import Label from '../../../shared/components/ui/Label.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Button from '../../../shared/components/ui/Button.jsx';

// Kani waa foomka oo si buuxda u shaqaynaya
export default function SubjectForm({ subject, onClose, onSubmit, allGrades, isSubmitting=false, onDirty }) {
    // State lagu keydiyo xogta foomka
    const [formData, setFormData] = useState({
        subjectName: '',
        subjectCode: '',
        grades: [] // Liiska ID-yada heerarka la doortay
    });
    // State lagu ogaanayo in user-ku uu gacanta ku beddelay code-ka
    const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);

    // useEffect si uu u buuxiyo foomka marka la tafatirayo
    useEffect(() => {
        if (subject) {
            setFormData({
                subjectName: subject.subjectName || '',
                subjectCode: subject.subjectCode || '',
                grades: subject.grades.map(g => g._id) || []
            });
            setIsCodeManuallyEdited(true); // Ha isbeddelin code-ka marka la tafatirayo
        } else {
             // Nadiifi foomka marka la abuurayo mid cusub
            setFormData({ subjectName: '', subjectCode: '', grades: [] });
            setIsCodeManuallyEdited(false);
        }
    }, [subject]);

    // **LOGIC-GA CUSUB: Abuurista Code-ka Automatic-ga ah**
    useEffect(() => {
        // Haddii user-ku uusan weli gacanta ku qorin code-ka...
        if (!isCodeManuallyEdited && formData.subjectName) {
            // Soo qaado 3-da xaraf ee ugu horreeya magaca, una beddel xarfo waaweyn
            const generatedCode = formData.subjectName.substring(0, 3).toUpperCase() + '101';
            // Cusboonaysii state-ka
            setFormData(prev => ({ ...prev, subjectCode: generatedCode }));
        }
    }, [formData.subjectName, isCodeManuallyEdited]);


    const handleCodeChange = (e) => {
        // Marka user-ku uu gacanta ku qoro code-ka, jooji abuurista automatic-ga ah
        setIsCodeManuallyEdited(true);
        handleChange(e);
    };

    // Toggle grade selection (checkbox style)
    const toggleGrade = (id) => {
        setFormData(prev => {
            const exists = prev.grades.includes(id);
            const grades = exists ? prev.grades.filter(g => g !== id) : [...prev.grades, id];
            return { ...prev, grades };
        });
        onDirty && onDirty();
    };

    // Shaqada maareysa isbeddelka sanduuqyada qoraalka
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        onDirty && onDirty();
    };

    // Shaqada keydinta
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label>Subject Name</Label>
                    <Input type="text" name="subjectName" value={formData.subjectName} onChange={handleChange} className="mt-1" required disabled={isSubmitting} />
                </div>
                <div>
                    <Label>Subject Code</Label>
                    <Input type="text" name="subjectCode" value={formData.subjectCode} onChange={handleCodeChange} className="mt-1" disabled={isSubmitting} />
                </div>
                <div className="md:col-span-2">
                    <Label>Associated Grades</Label>
                    <div className="mt-1 max-h-56 overflow-y-auto border border-gray-300 rounded-md px-3 py-2 divide-y divide-gray-100">
                        {[...allGrades].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(grade => {
                            const id = grade._id;
                            const checked = formData.grades.includes(id);
                            return (
                                <label key={id} className="flex items-center gap-3 py-2">
                                    <Checkbox checked={checked} onChange={() => toggleGrade(id)} disabled={isSubmitting} />
                                    <span className="text-sm text-gray-800">{grade.gradeName}</span>
                                </label>
                            );
                        })}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Select one or more grades.</p>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
                <Button type="button" variant="neutral" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isSubmitting}>
                    {isSubmitting ? (subject ? 'Updating...' : 'Saving...') : (subject ? 'Update Subject' : 'Save Subject')}
                </Button>
            </div>
        </form>
    );
}

