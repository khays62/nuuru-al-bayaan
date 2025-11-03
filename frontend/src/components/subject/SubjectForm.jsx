import React, { useState, useEffect } from 'react';

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
                    <label className="block text-sm font-medium text-gray-700">Subject Name</label>
                    <input type="text" name="subjectName" value={formData.subjectName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Subject Code</label>
                    <input type="text" name="subjectCode" value={formData.subjectCode} onChange={handleCodeChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Associated Grades</label>
                    <div className="mt-1 max-h-56 overflow-y-auto border border-gray-300 rounded-md px-3 py-2 divide-y divide-gray-100">
                        {[...allGrades].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(grade => {
                            const id = grade._id;
                            const checked = formData.grades.includes(id);
                            return (
                                <label key={id} className="flex items-center gap-3 py-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={checked}
                                        onChange={() => toggleGrade(id)}
                                    />
                                    <span className="text-sm text-gray-800">{grade.gradeName}</span>
                                </label>
                            );
                        })}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Select one or more grades.</p>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`px-4 py-2 rounded-md text-white ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{isSubmitting ? (subject ? 'Updating...' : 'Saving...') : (subject ? 'Update Subject' : 'Save Subject')}</button>
            </div>
        </form>
    );
}

