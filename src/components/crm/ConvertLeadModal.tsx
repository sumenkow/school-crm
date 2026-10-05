import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, User, BookOpen, Layers, Calendar, CreditCard, Sparkles } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { FullLeadData, FullGroupData } from '@/lib/data/mockData';
import { convertLeadToStudentTransaction } from '@/lib/data/conversionHelper';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { calculateAge, formatAgeRussian } from '@/lib/data/studentAgeHelper';

interface ConvertLeadModalProps {
  isOpen: boolean;
  lead: FullLeadData | null;
  onClose: () => void;
  onSuccess: (studentId: string) => void;
}

export function ConvertLeadModal({ isOpen, lead, onClose, onSuccess }: ConvertLeadModalProps) {
  const toast = useToast();
  const [studentType, setStudentType] = useState<'school_student' | 'adult_student'>('school_student');
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentBirthDate, setStudentBirthDate] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [courseName, setCourseName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<FullGroupData[]>([]);

  useEffect(() => {
    if (lead && isOpen) {
      const isAdult = lead.clientType === 'adult_student';
      setStudentType(isAdult ? 'adult_student' : 'school_student');

      const sFirst = lead.studentFirstName || (lead.studentName ? lead.studentName.split(' ')[0] : '') || (isAdult && lead.name ? lead.name.split(' ')[0] : '') || '';
      const sLast = lead.studentLastName || (lead.studentName ? lead.studentName.split(' ').slice(1).join(' ') : '') || (isAdult && lead.name ? lead.name.split(' ').slice(1).join(' ') : '') || '';
      setStudentFirstName(sFirst);
      setStudentLastName(sLast);
      setStudentGrade(lead.studentGrade || lead.grade || (isAdult ? 'Студент' : '1 класс'));

      const pName = lead.parentLastName && lead.parentFirstName
        ? `${lead.parentLastName} ${lead.parentFirstName}`
        : lead.name || '';
      setParentName(pName);
      setParentPhone(lead.contact || '');
      setTelegram(lead.telegram || '');
      setCourseName(lead.directionOrCourse || 'Английский язык');
      setStartDate(new Date().toISOString().slice(0, 10));

      const numAmount = parseInt((lead.offerAmount || '').replace(/\D/g, ''), 10);
      setDepositAmount(!isNaN(numAmount) && numAmount > 0 ? numAmount : 0);

      const allG = getStoredGroups().filter(g => !g.isDeleted);
      setGroups(allG);

      // Find matching group by course if possible
      const leadCourse = (lead.directionOrCourse || '').toLowerCase();
      const matched = allG.find(g => (g.courseName || '').toLowerCase() === leadCourse) || allG[0];
      if (matched) {
        setSelectedGroupId(matched.id);
      }
    }
  }, [lead, isOpen]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    if (!courseName.trim()) return groups;
    const cLower = courseName.trim().toLowerCase();
    const match = groups.filter(g => {
      const gCourse = (g?.courseName || '').toLowerCase();
      return (gCourse && (gCourse.includes(cLower) || cLower.includes(gCourse)));
    });
    return match.length > 0 ? match : groups;
  }, [groups, courseName]);

  const studentAge = useMemo(() => {
    const age = calculateAge(studentBirthDate);
    return age !== null ? formatAgeRussian(age) : null;
  }, [studentBirthDate]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const chosenGroup = groups.find(g => g.id === selectedGroupId);
      const res = await convertLeadToStudentTransaction({
        lead,
        studentType,
        studentFirstName,
        studentLastName,
        studentBirthDate: studentBirthDate || undefined,
        studentGrade,
        parentName: studentType === 'school_student' ? parentName : undefined,
        parentPhone: studentType === 'school_student' ? parentPhone : undefined,
        parentEmail: email || undefined,
        parentTelegram: telegram || undefined,
        courseName: courseName || chosenGroup?.courseName || 'Основной курс',
        groupId: chosenGroup?.id,
        groupName: chosenGroup?.name || 'Основная группа',
        teacherName: chosenGroup?.teacherName,
        schedule: chosenGroup?.schedule,
        startDate,
        depositAmount: depositAmount > 0 ? depositAmount : 0,
      });

      toast.success('Ученик успешно зачислен в группу');
      onSuccess(res.studentId);
      onClose();
    } catch (err) {
      toast.error('Ошибка зачисления лида');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150 text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-lead-modal-title"
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="convert-lead-modal-title" className="text-base font-bold text-slate-900">Зачисление в ученики</h3>
              <p className="text-[11px] text-slate-500">Автоматический перенос всех данных лида в карточку ученика</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Target Lead Info Summary */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-800">Перенос лида</p>
              <p className="text-sm font-bold text-slate-900">{lead.name}</p>
              <p className="text-xs text-slate-600 font-mono mt-0.5">{lead.contact} • {lead.directionOrCourse}</p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-md bg-white border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
                {lead.offerAmount || '0 €'}
              </span>
            </div>
          </div>

          {/* Student Type Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Категория обучающегося</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100/90 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStudentType('school_student')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${studentType === 'school_student' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                👶 Ребенок (с родителем)
              </button>
              <button
                type="button"
                onClick={() => setStudentType('adult_student')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${studentType === 'adult_student' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                👤 Взрослый студент
              </button>
            </div>
          </div>

          {/* Student Fields */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Данные ученика
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Имя ученика</label>
                <input
                  type="text"
                  value={studentFirstName}
                  onChange={(e) => setStudentFirstName(e.target.value)}
                  placeholder="Матвей"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Фамилия ученика</label>
                <input
                  type="text"
                  value={studentLastName}
                  onChange={(e) => setStudentLastName(e.target.value)}
                  placeholder="Морозов"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Дата рождения</label>
                  {studentAge && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                      {studentAge}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={studentBirthDate}
                  onChange={(e) => setStudentBirthDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Класс / Грейд</label>
                <input
                  type="text"
                  value={studentGrade}
                  onChange={(e) => setStudentGrade(e.target.value)}
                  placeholder="4 класс"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Parent Fields (if school_student) */}
          {studentType === 'school_student' && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Данные родителя / Заказчика
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">ФИО Родителя</label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Телефон родителя</label>
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Group & Course Selection */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Зачисление в группу
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Курс / Направление</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Группа обучения</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
                >
                  {filteredGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.students?.length || 0}/{g.capacity || 8}) • {g.schedule}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Дата старта</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Первый взнос (€)</label>
                <input
                  type="number"
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  placeholder="120 €"
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={16} /> Подтвердить зачисление в ученики
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

