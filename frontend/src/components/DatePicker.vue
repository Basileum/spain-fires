<template>
  <div class="date-picker-container">
    <!-- Date Input Field -->
    <div v-if="!isCumulatedMode" class="date-input-container" @click="toggleCalendar">
      <input
        type="text"
        :value="displayValue"
        readonly
        class="date-input"
        :placeholder="t('datePicker.placeholder')"
      />
      <span class="calendar-icon"></span>
    </div>

    <!-- Date Input Field for Cumulated Mode -->
    <div v-else class="date-input-container" @click="toggleCalendar">
      <input
        type="text"
        :value="displayValue"
        readonly
        class="date-input"
        :placeholder="t('datePicker.rangePlaceholder')"
      />
      <span class="calendar-icon"></span>
    </div>

    <!-- Calendar Dropdown -->
    <div v-if="isOpen" class="calendar-dropdown">
      <div class="calendar-content">
                  <!-- Predefined Ranges -->
          <div class="predefined-ranges">
            <h4>{{ t('datePicker.predefinedRanges') }}</h4>
            <div v-if="!isCumulatedMode" class="range-options">
              <button
                v-for="range in predefinedRanges"
                :key="range.key"
                @click="selectPredefinedRange(range)"
                class="range-option"
              >
                {{ t(`datePicker.ranges.${range.key}`) }}
              </button>
            </div>
            <div v-else class="range-options">
              <button
                v-for="range in predefinedRanges"
                :key="range.key"
                @click="selectPredefinedRange(range)"
                class="range-option"
              >
                {{ t(`datePicker.ranges.${range.key}`) }}
              </button>
            </div>
            <button @click="resetSelection" class="reset-button">
              {{ t('datePicker.reset') }}
            </button>
          </div>

                  <!-- Calendar -->
          <div class="calendar-section">
            <div class="calendar-header">
              <button @click="previousMonth" class="nav-button">&lt;</button>
              <h4>{{ currentMonthYear }}</h4>
              <button @click="nextMonth" class="nav-button">&gt;</button>
            </div>

            <!-- Date Range Selection Info -->
            <div v-if="isCumulatedMode" class="range-selection-info">
              <div class="selection-status">
                <span v-if="isSelectingStart" class="selecting-start">
                  {{ t('datePicker.selectingStart') }}
                </span>
                <span v-else class="selecting-end">
                  {{ t('datePicker.selectingEnd') }}
                </span>
              </div>
              <div class="current-range">
                <span>{{ t('datePicker.start') }}: {{ formatDate(dateRange.start) }}</span>
                <span v-if="!isSelectingStart">{{ t('datePicker.end') }}: {{ formatDate(dateRange.end) }}</span>
              </div>
            </div>

            <div class="calendar-grid">
              <!-- Day headers -->
              <div class="day-header" v-for="day in dayNames" :key="day">
                {{ day }}
              </div>

              <!-- Calendar days -->
              <div
                v-for="day in calendarDays"
                :key="day.date.toISOString()"
                :class="[
                  'calendar-day',
                  {
                    'other-month': !day.isCurrentMonth,
                    'selected': isSelectedDate(day.date),
                    'in-range': isInRange(day.date),
                    'today': isToday(day.date)
                  }
                ]"
                @click="selectDate(day.date)"
              >
                {{ day.dayNumber }}
              </div>
            </div>
          </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  modelValue: string;
  mode?: 'current' | 'cumulated';
  dataRange?: { start: string; end: string };
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'update:dateRange', value: { start: string; end: string }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

const isOpen = ref(false);
const currentDate = ref(new Date(props.modelValue || new Date()));

// Date range state for cumulated mode
const dateRange = ref({
  start: props.dataRange?.start || '2024-01-01', // Use actual data start date if provided
  end: props.modelValue || props.dataRange?.end || new Date().toISOString().split('T')[0]
});

// Watch for changes in dataRange prop and update dateRange accordingly
watch(() => props.dataRange, (newDataRange) => {
  if (newDataRange) {
    dateRange.value = {
      start: newDataRange.start,
      end: newDataRange.end
    };
  }
}, { immediate: true });

const isCumulatedMode = computed(() => props.mode === 'cumulated');
const isSelectingStart = ref(true); // Track which date we're selecting

// Predefined date ranges
const predefinedRanges = [
  { key: 'today', getDate: () => new Date() },
  { key: 'yesterday', getDate: () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  }},
  { key: 'lastWeek', getDate: () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  }},
  { key: 'lastMonth', getDate: () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  }},
  { key: 'lastQuarter', getDate: () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date;
  }}
];

// Day names
const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Computed properties
const displayValue = computed(() => {
  if (isCumulatedMode.value) {
    const startDate = new Date(dateRange.value.start);
    const endDate = new Date(dateRange.value.end);
    return `${startDate.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    })} - ${endDate.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    })}`;
  } else {
    if (!props.modelValue) return '';
    const date = new Date(props.modelValue);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  }
});

const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
});

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - (firstDay.getDay() || 7) + 1);
  
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (7 - (lastDay.getDay() || 7)));
  
  const days = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    days.push({
      date: new Date(current),
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === month
    });
    current.setDate(current.getDate() + 1);
  }
  
  return days;
});

// Methods
const toggleCalendar = () => {
  isOpen.value = !isOpen.value;
};

// Helper function to format date in local timezone (YYYY-MM-DD)
const formatDateToLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const selectDate = (date: Date) => {
  if (isCumulatedMode.value) {
    const dateStr = formatDateToLocalString(date);
    if (isSelectingStart.value) {
      dateRange.value.start = dateStr;
      isSelectingStart.value = false;
    } else {
      if (dateStr >= dateRange.value.start) {
        dateRange.value.end = dateStr;
        emit('update:dateRange', dateRange.value);
        isOpen.value = false;
        isSelectingStart.value = true; // Reset for next selection
      } else {
        // If end date is before start date, swap them
        dateRange.value.end = dateRange.value.start;
        dateRange.value.start = dateStr;
        emit('update:dateRange', dateRange.value);
        isOpen.value = false;
        isSelectingStart.value = true;
      }
    }
  } else {
    emit('update:modelValue', formatDateToLocalString(date));
    isOpen.value = false;
  }
};

const onDateInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

const selectPredefinedRange = (range: any) => {
  if (isCumulatedMode.value) {
    const endDate = range.getDate();
    const startDate = props.dataRange?.start ? new Date(props.dataRange.start) : new Date('2024-01-01');
    dateRange.value = {
      start: formatDateToLocalString(startDate),
      end: formatDateToLocalString(endDate)
    };
    emit('update:dateRange', dateRange.value);
  } else {
    const date = range.getDate();
    emit('update:modelValue', formatDateToLocalString(date));
  }
  isOpen.value = false;
};

const resetSelection = () => {
  emit('update:modelValue', '');
  isOpen.value = false;
};

const previousMonth = () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() - 1);
  currentDate.value = newDate;
};

const nextMonth = () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() + 1);
  currentDate.value = newDate;
};

const isSelectedDate = (date: Date) => {
  return props.modelValue === formatDateToLocalString(date);
};

const isToday = (date: Date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  });
};

const isInRange = (date: Date) => {
  if (!isCumulatedMode.value) return false;
  const dateStr = formatDateToLocalString(date);
  return dateStr >= dateRange.value.start && dateStr <= dateRange.value.end;
};

// Close calendar when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  if (!target.closest('.date-picker-container')) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.date-picker-container {
  position: relative;
  width: 100%;
}

.date-input-container {
  position: relative;
  cursor: pointer;
}

.date-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary, #dee2e6);
  border-radius: 6px;
  font-size: 13px;
  background: var(--bg-primary, white);
  color: var(--text-primary, #495057);
  cursor: pointer;
  padding-right: 35px;
}

.date-input:focus {
  outline: none;
  border-color: var(--primary-color, #007bff);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.calendar-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-secondary, #6c757d);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236c757d'%3E%3Cpath d='M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.calendar-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary, white);
  border: 1px solid var(--border-primary, #dee2e6);
  border-radius: 8px;
  box-shadow: var(--shadow, 0 -4px 12px rgba(0, 0, 0, 0.15));
  z-index: 1000;
  margin-bottom: 4px;
  max-height: 400px;
  overflow: hidden;
}

.calendar-content {
  display: flex;
  min-height: 300px;
  max-height: 400px;
  overflow: hidden;
}

.predefined-ranges {
  width: 160px;
  padding: 16px;
  border-right: 1px solid var(--border-primary, #e9ecef);
  background: var(--bg-secondary, #f8f9fa);
  overflow-y: auto;
}

.predefined-ranges h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #212529);
}

.range-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.range-option {
  padding: 10px 14px;
  border: 1px solid var(--border-primary, #e9ecef);
  background: var(--bg-primary, white);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary, #495057);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  font-weight: 500;
}

.range-option:hover {
  background: var(--bg-tertiary, #e9ecef);
}

.reset-button {
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--primary-color, #007bff);
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

.reset-button:hover {
  color: var(--primary-hover, #0056b3);
}

.calendar-section {
  flex: 1;
  padding: 16px;
  background: var(--bg-primary, white);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.calendar-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #212529);
}

.nav-button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-primary, #dee2e6);
  background: var(--bg-primary, white);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-primary, #495057);
}

.nav-button:hover {
  background: var(--bg-secondary, #f8f9fa);
  border-color: var(--primary-color, #007bff);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.day-header {
  padding: 10px 6px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #495057);
  background: var(--bg-secondary, #f8f9fa);
  border-radius: 4px;
  border: 1px solid var(--border-primary, #e9ecef);
}

.calendar-day {
  padding: 10px 6px;
  text-align: center;
  font-size: 14px;
  color: var(--text-primary, #495057);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  background: var(--bg-primary, white);
}

.calendar-day:hover {
  background: var(--bg-tertiary, #e9ecef);
}

.calendar-day.other-month {
  color: var(--text-secondary, #adb5bd);
}

.calendar-day.selected {
  background: #007bff;
  color: white;
  font-weight: 600;
}

.calendar-day.today {
  border: 2px solid #007bff;
  font-weight: 600;
}

.calendar-day.today.selected {
  border-color: white;
}

.range-selection-info {
  margin-bottom: 12px;
  padding: 10px 14px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.selection-status {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.selecting-start {
  color: #007bff;
}

.selecting-end {
  color: #28a745;
}

.current-range {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #495057;
  font-weight: 500;
}

.calendar-day.in-range {
  background: #e3f2fd;
  color: #1976d2;
}

.calendar-day.in-range.selected {
  background: #007bff;
  color: white;
}
</style>
