import React, { useState } from "react";
import TimeSlot from "./TimeSlot";

const DateButton = ({ date, selectedTable, bookedSlots, onSelect, onTimeSelect }) => {
  const [showTimeSlots, setShowTimeSlots] = useState(false);

  const handleDateClick = () => {
    setShowTimeSlots(!showTimeSlots);
    onSelect(date);
  };

  const generateTimeSlots = () => {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const startHour = isWeekend ? 12 : 14;
    const endHour = 26;
    const slots = [];

    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${hour % 24}:00`;
      const isBooked = bookedSlots.some(
        (slot) =>
          slot.table === selectedTable &&
          new Date(slot.date).toDateString() === date.toDateString() &&
          slot.time === time
      );
      slots.push({ time, isBooked });
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div>
      <button onClick={handleDateClick}>
        {date.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}
        {showTimeSlots ? " ▲" : " ▼"}
      </button>
      {showTimeSlots && (
        <div className="time-slots">
          {timeSlots.map((slot, index) => (
            <TimeSlot
              key={index}
              time={slot.time}
              isBooked={slot.isBooked}
              onSelect={() => onTimeSelect(slot.time)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DateButton;