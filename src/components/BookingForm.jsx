import React, { useState } from "react";

const BookingForm = ({ selectedTable, selectedDate, selectedTime, onSubmit, onCancel }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("1");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      table: selectedTable,
      date: selectedDate.toISOString().split("T")[0],
      time: selectedTime,
      name,
      phone,
      hours,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Подтверждение брони</h3>
      <p>
        Стол {selectedTable}, {selectedDate.toLocaleDateString("ru-RU")}, {selectedTime}
      </p>
      <label>
        Имя:
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          pattern="[A-Za-zА-Яа-я\s]{1,30}"
          title="Только буквы и пробелы, до 30 символов"
        />
      </label>
      <label>
        Телефон:
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          pattern="\d{10,15}"
          title="Только цифры, от 10 до 15 символов"
        />
      </label>
      <label>
        Количество часов:
        <select value={hours} onChange={(e) => setHours(e.target.value)}>
          <option value="1">1 час</option>
          <option value="2">2 часа</option>
        </select>
      </label>
      <div className="form-buttons">
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit">Подтвердить</button>
      </div>
    </form>
  );
};

export default BookingForm;