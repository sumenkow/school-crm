'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardStateReturn } from '../hooks/useDashboardState';
import { HeaderGreeting } from './HeaderGreeting';
import { KpiGrid } from './KpiGrid';
import { AttentionFeed } from './AttentionFeed';
import { TodayScheduleWidget } from './TodayScheduleWidget';
import { FunnelWidget } from './FunnelWidget';
import { QuickFinanceWidget } from './QuickFinanceWidget';
import { GroupOccupancyWidget } from './GroupOccupancyWidget';
import { TeachersListWidget } from './TeachersListWidget';
import { WeeklySummaryStrip } from './WeeklySummaryStrip';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { TaskModal } from '@/components/dashboard/TaskModal';
import { TeacherModal } from '@/components/dashboard/TeacherModal';
import { QuickActionDrawer } from '@/components/dashboard/QuickActionDrawer';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { LeadDetailsModal } from '@/components/crm/LeadDetailsModal';
import { LessonQuickViewModal } from '@/components/calendar/LessonQuickViewModal';
import { saveLessonToStorage, getStoredLessons } from '@/lib/data/lessonStorage';

interface DashboardDesktopProps extends DashboardStateReturn {
  onOpenReport: () => void;
  onOpenExecutiveReport?: () => void;
}

export function DashboardDesktop({
  data,
  actions,
  onOpenReport,
  onOpenExecutiveReport,
}: DashboardDesktopProps) {
  const router = useRouter();

  return (
    <div className="hidden md:block space-y-3 w-full max-w-[1600px] mx-auto overflow-x-hidden bg-[#f8fafc]">
      
      {/* 1. Header Greeting & Top Month Switcher */}
      <HeaderGreeting
        selectedDate={data.selectedDate}
        onPrevMonth={actions.prevMonth}
        onNextMonth={actions.nextMonth}
        onResetMonth={actions.resetMonth}
        onOpenReport={onOpenReport}
        onOpenExecutiveReport={onOpenExecutiveReport}
        onOpenCreateLead={actions.openCreateLead}
      />

      {/* 2. Top Row (5 KPI Cards, 115px) */}
      <WidgetErrorBoundary widgetName="Метрики KPI" onRetry={actions.refreshAll}>
        <KpiGrid
          payments={data.payments}
          students={data.students}
          leads={data.leads}
          groups={data.groups}
          tasks={data.tasks}
          selectedDate={data.selectedDate}
          isLoading={data.isLoading}
        />
      </WidgetErrorBoundary>

      {/* 3. Operations Row (12 Columns: 5 Фокус внимания | 4 Сегодня | 3 Воронка лидов) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-5 flex flex-col">
          <WidgetErrorBoundary widgetName="Фокус внимания" onRetry={actions.refreshAll}>
            <AttentionFeed
              payments={data.payments}
              leads={data.leads}
              groups={data.groups}
              tasks={data.tasks}
              students={data.students}
              onOpenLead={actions.openLead}
              onOpenTask={actions.openTask}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>
        </div>

        <div className="lg:col-span-4 flex flex-col">
          <WidgetErrorBoundary widgetName="Расписание на сегодня" onRetry={actions.refreshAll}>
            <TodayScheduleWidget
              lessons={data.lessons}
              onSelectLesson={(lesson) => actions.openLesson(lesson)}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>
        </div>

        <div className="lg:col-span-3 flex flex-col">
          <WidgetErrorBoundary widgetName="Воронка продаж" onRetry={actions.refreshAll}>
            <FunnelWidget
              leads={data.leads}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* 4. Management Row (3 Equal Columns: Финансы | Группы | Команда преподавателей) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        <div className="flex flex-col h-full">
          <WidgetErrorBoundary widgetName="Финансовый обзор" onRetry={actions.refreshAll}>
            <QuickFinanceWidget
              payments={data.payments}
              students={data.students}
              selectedDate={data.selectedDate}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>
        </div>

        <div className="flex flex-col h-full">
          <WidgetErrorBoundary widgetName="Заполняемость групп" onRetry={actions.refreshAll}>
            <GroupOccupancyWidget
              groups={data.groups}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>
        </div>

        <div className="flex flex-col h-full">
          <WidgetErrorBoundary widgetName="Команда преподавателей" onRetry={actions.refreshAll}>
            <TeachersListWidget
              teachers={data.teachers}
              groups={data.groups}
              onSelectTeacher={(t) => actions.openTeacher(t)}
              isLoading={data.isLoading}
            />
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* 5. Bottom Weekly Summary Strip (С этой недели) */}
      <WeeklySummaryStrip
        lessons={data.lessons}
        students={data.students}
        groups={data.groups}
        payments={data.payments}
        onOpenReport={onOpenReport}
        isLoading={data.isLoading}
      />

      {/* Modals & Drawers */}
      <TaskModal
        isOpen={!!data.selectedTask}
        taskData={data.selectedTask}
        onClose={actions.closeTask}
        onComplete={actions.completeTask}
      />

      <TeacherModal
        isOpen={!!data.selectedTeacher}
        teacherData={data.selectedTeacher}
        onClose={actions.closeTeacher}
      />

      <CreateLeadModal
        isOpen={data.isCreateLeadOpen}
        onClose={actions.closeCreateLead}
        onCreated={() => {
          actions.refreshAll();
          actions.closeCreateLead();
        }}
      />

      <LeadDetailsModal
        isOpen={data.isLeadDrawerOpen && !!data.selectedLead}
        lead={data.selectedLead}
        onClose={actions.closeLead}
        onUpdateLead={() => actions.refreshAll()}
      />

      <LessonQuickViewModal
        isOpen={!!data.selectedLesson}
        lesson={data.selectedLesson}
        onClose={actions.closeLesson}
        onUpdateAttendance={(lessonId, studentId, status) => {
          const all = getStoredLessons();
          const target = all.find(l => l.id === lessonId);
          if (target) {
            const updatedStudents = (target.students || []).map(s => {
              if (s.id === studentId) return { ...s, attendanceStatus: status };
              return s;
            });
            saveLessonToStorage({ ...target, students: updatedStudents });
            actions.refreshAll();
          }
        }}
      />

      <QuickActionDrawer
        state={data.drawerState}
        onClose={actions.closeDrawer}
        onSuccess={() => actions.refreshAll()}
      />
    </div>
  );
}
