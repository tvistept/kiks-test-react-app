import React from "react";

const TimeSlot = ({ time, isBooked, onSelect }) => {
  return (
    <button
      className={isBooked ? "booked" : ""}
      onClick={isBooked ? null : onSelect}
      disabled={isBooked}
    >
      {time}
    </button>
  );
};

export default TimeSlot;