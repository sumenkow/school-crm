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
    <div className="hidden md:block space-y-4 lg:space-y-5 w-full p-4 lg:p-6 max-w-[1600px] mx-auto overflow-x-hidden bg-[#f8fafc] min-h-screen">
      
      {/* 1. Header Greeting & Top Month Switcher */}
      <HeaderGreeting
        onOpenReport={onOpenReport}
        onOpenExecutiveReport={onOpenExecutiveReport}
        onOpenCreateLead={actions.openCreateLead}
      />

      {/* 2. Top Row (5 KPI Cards, 165px) */}
      <WidgetErrorBoundary widgetName="Метрики KPI" onRetry={actions.refreshAll}>
        <KpiGrid
          payments={data.payments}
          students={data.students}
          leads={data.leads}
          groups={data.groups}
          tasks={data.tasks}
          isLoading={data.isLoading}
        />
      </WidgetErrorBoundary>

      {/* 3. Operations Row (3 Equal Columns: Требует вашего внимания | Сегодня | Воронка лидов) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
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

        <WidgetErrorBoundary widgetName="Расписание на сегодня" onRetry={actions.refreshAll}>
          <TodayScheduleWidget
            lessons={data.lessons}
            isLoading={data.isLoading}
          />
        </WidgetErrorBoundary>

        <WidgetErrorBoundary widgetName="Воронка продаж" onRetry={actions.refreshAll}>
          <FunnelWidget
            leads={data.leads}
            isLoading={data.isLoading}
          />
        </WidgetErrorBoundary>
      </div>

      {/* 4. Management Row (3 Equal Columns: Финансы | Группы | Команда преподавателей) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        <WidgetErrorBoundary widgetName="Финансовый обзор" onRetry={actions.refreshAll}>
          <QuickFinanceWidget
            payments={data.payments}
            students={data.students}
            isLoading={data.isLoading}
          />
        </WidgetErrorBoundary>

        <WidgetErrorBoundary widgetName="Заполняемость групп" onRetry={actions.refreshAll}>
          <GroupOccupancyWidget
            groups={data.groups}
            isLoading={data.isLoading}
          />
        </WidgetErrorBoundary>

        <WidgetErrorBoundary widgetName="Команда преподавателей" onRetry={actions.refreshAll}>
          <TeachersListWidget
            teachers={data.teachers}
            groups={data.groups}
            onSelectTeacher={(t) => actions.openTeacher(t)}
            isLoading={data.isLoading}
          />
        </WidgetErrorBoundary>
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

      <QuickActionDrawer
        state={data.drawerState}
        onClose={actions.closeDrawer}
        onSuccess={() => actions.refreshAll()}
      />
    </div>
  );
}
