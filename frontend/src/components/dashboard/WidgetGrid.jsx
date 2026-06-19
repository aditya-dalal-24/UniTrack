import React, { memo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import SmartRemindersWidget from "./SmartRemindersWidget";
import AttendanceRiskWidget from "./AttendanceRiskWidget";
import SmartTasksWidget from "./SmartTasksWidget";
import AcademicPressureWidget from "./AcademicPressureWidget";
import ExpenseSnapshotWidget from "./ExpenseSnapshotWidget";
import SemesterHealthWidget from "./SemesterHealthWidget";

/**
 * SortableItem wrapper for dnd-kit
 */
function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  // Clone the child element to pass dragHandleProps directly to the WidgetShell
  const childWithProps = React.cloneElement(children, {
    dragHandleProps: { ...attributes, ...listeners },
  });

  return (
    <div ref={setNodeRef} style={style}>
      {childWithProps}
    </div>
  );
}

/**
 * WidgetGrid — Responsive DND Bento Grid for dashboard insights.
 * The "Today" section is now a fixed strip above this grid.
 */
function WidgetGridInner({
  insights,
  order,
  onReorder,
  onHideWidget,
  loading,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id);
      const newIndex = order.indexOf(over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  const renderWidget = (widgetId) => {
    const commonProps = {
      loading,
      onHide: () => onHideWidget(widgetId),
    };

    switch (widgetId) {
      case "reminders":
        return (
          <SmartRemindersWidget
            key={widgetId}
            reminders={insights?.reminders || []}
            {...commonProps}
          />
        );
      case "attendance-risk":
        return (
          <AttendanceRiskWidget
            key={widgetId}
            data={insights?.attendanceRisk}
            {...commonProps}
          />
        );
      case "smart-tasks":
        return (
          <SmartTasksWidget
            key={widgetId}
            data={insights?.tasks}
            {...commonProps}
          />
        );
      case "academic-pressure":
        return (
          <AcademicPressureWidget
            key={widgetId}
            data={insights?.pressure}
            {...commonProps}
          />
        );
      case "expense-snapshot":
        return (
          <ExpenseSnapshotWidget
            key={widgetId}
            data={insights?.expenses}
            {...commonProps}
          />
        );
      case "semester-health":
        return (
          <SemesterHealthWidget
            key={widgetId}
            data={insights?.semesterHealth}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[280px]">
          {order.map((id) => {
            const widget = renderWidget(id);
            if (!widget) return null;
            return (
              <SortableItem key={id} id={id}>
                {widget}
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default memo(WidgetGridInner);
