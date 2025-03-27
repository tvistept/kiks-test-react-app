import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import {useTelegram} from "./hooks/useTelegram";


function App() {
  const {tg, user} = useTelegram();

  // useEffect(() => {
  //   tg.ready();
  // }, [])

  tg.expand();
  console.log(user)
  const userChatId = 93753787;
  const [isPopupOpen, setPopupOpen] = useState(false); // Состояние для попапа "Мои брони"
  const [isDeletePopupOpen, setDeletePopupOpen] = useState(false); // Состояние для попапа подтверждения удаления
  const [bookingToDelete, setBookingToDelete] = useState(null); // Бронирование, которое пользователь хочет удалить
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]); // Имитация таблицы пользователей
  const [existingBookings, setExistingBookings] = useState([]);
  const [userBookings, setUserBookings] = useState([]);

  const [selectedTable, setSelectedTable] = useState(3); // Состояние для выбранного стола
  const [selectedDate, setSelectedDate] = useState(null); // Состояние для выбранной даты
  const [openDate, setOpenDate] = useState(null); // Состояние для открытой даты (чтобы показывать слоты)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null); // Состояние для выбранного временного слота
  const [isBookingPopupOpen, setBookingPopupOpen] = useState(false); // Состояние для попапа бронирования
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    hours: 1,
  });
  const [notification, setNotification] = useState(null); // Состояние для уведомления
  const [hintMessage, setHintMessage] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Функция для загрузки бронирований с сервера
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://kiks-app.ru:5000/api/bookings'); 
      if (!response.ok) {
        throw new Error('Ошибка загрузки бронирований');
      }
      const data = await response.json();
      
      let dataToSet = data.map(booking => ({
        id: booking.booking_id,
        table: booking.table,
        date: booking.booking_date.slice(0, 10),
        time: booking.time.slice(0, 5),
        hours: booking.hours,
        name: booking.user_name,
        chat_id: booking.chat_id
      }));
      setBookings(dataToSet);
      setExistingBookings(dataToSet);
      setUserBookings(dataToSet.filter(booking => booking.chat_id === userChatId).sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (err) {
      setError(err.message);
      console.error('Ошибка при загрузке бронирований:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Функция для загрузки пользователя с сервера по chat_id
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://kiks-app.ru:5000/api/get-user`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки пользователя');
      }
      const data = await response.json();
      
      const userData = Array.isArray(data) ? data[0] : data;
      console.log(userData);
    } catch (err) {
      setError(err.message);
      console.error('Ошибка при загрузке пользователя:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загружаем бронирования при монтировании компонента
  useEffect(() => {
    fetchBookings();
    fetchUser();
  }, [fetchBookings, fetchUser]);


  // Функция для генерации дат на неделю вперёд
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // Формат YYYY-MM-DD
    }
    return dates;
  };

  // Функция для генерации временных слотов с 12:00 до 02:00
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 12; hour <= 25; hour++) {
      const time = hour % 24; // Преобразуем 24-часовой формат
      slots.push(`${time < 10 ? '0' : ''}${time}:00`);
    }
    return slots;
  };

  const dates = generateDates(); // Генерируем даты
  const timeSlots = generateTimeSlots(); // Генерируем временные слоты

  const handleTestButtonClick = () => {
    let table = isTableAvailableForUser(selectedTable, selectedDate);
  };

  // Обработчик открытия/закрытия попапа "Мои брони"
  const handleBookingButtonClick = () => {
    setPopupOpen(!isPopupOpen);
  };

  // Обработчик открытия попапа подтверждения удаления
  const openDeletePopup = (id) => {
    setBookingToDelete(id);
    setDeletePopupOpen(true);
  };

  // Обработчик закрытия попапа подтверждения удаления
  const closeDeletePopup = () => {
    setBookingToDelete(null);
    setDeletePopupOpen(false);
  };

  // Обработчик удаления бронирования
  const handleDeleteBooking = async () => {
    console.log(bookingToDelete);
    if (bookingToDelete) {
      try {
        // const response = await fetch(`http://localhost:5000/api/bookings/${bookingToDelete}`, {
        //   method: 'DELETE'
        // });
        
        // if (!response.ok) {
        //   throw new Error('Ошибка удаления бронирования');
        // }
        
        setBookings(bookings.filter((booking) => booking.id !== bookingToDelete));
        setExistingBookings(existingBookings.filter((booking) => booking.id !== bookingToDelete));
        closeDeletePopup();
        setNotification('Бронирование успешно удалено');
        setTimeout(() => setNotification(null), 3000);
      } catch (err) {
        setError(err.message);
        console.error('Ошибка при удалении бронирования:', err);
      }
    }
  };

   // Обработчик выбора стола
   const handleTableSelect = (tableNumber) => {
    setSelectedTimeSlot(null);
    setSelectedTable(tableNumber);
  };

  const handleDateSelect = (date) => {
    if (openDate === date) {
      setOpenDate(null); // Закрываем слоты, если дата уже открыта
    } else {
      setOpenDate(date); // Открываем слоты для выбранной даты
    }
    setSelectedDate(date);
    setSelectedTimeSlot(null); // Сбрасываем выбранный временной слот при смене даты
    // Обновляем подсказку
    updateHintMessage(date);
  };

  // const handleTimeSlotSelect = (time) => {
  //   setSelectedTimeSlot(time); // Устанавливаем выбранный временной слот
  //   // setBookingPopupOpen(true); // Открываем попап бронирования
  // };

  const handleTimeSlotSelect = (time) => {
    setSelectedTimeSlot(time);
    // Обновляем количество часов в зависимости от выбранного слота
    const availableHours = getAvailableHours(selectedTable, selectedDate, time);
    setFormData({
      ...formData,
      hours: availableHours[0], // Устанавливаем первый доступный вариант
    });
  };

  // Обработчик для поля "Имя"
  const handleNameChange = (e) => {
    const value = e.target.value.replace(/[^A-Za-zА-Яа-я\s]/g, ''); // Оставляем только буквы и пробелы
    setFormData({
      ...formData,
      name: value,
    });
  };

  // Обработчик для поля "Телефон"
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Оставляем только цифры
    setFormData({
      ...formData,
      phone: value,
    });
  };

  const handleHoursChange = (e) => {
    setFormData({
      ...formData,
      hours: e.target.value,
    });
  };

  // const handleFormChange = (e) => {
  //   const { name, value } = e.target;
  //   setFormData({
  //     ...formData,
  //     [name]: value,
  //   });
  // };
  const closeBookingPopup = () => {
    setBookingPopupOpen(false);
    setSelectedTimeSlot(null); // Сбрасываем выбранный временной слот
  };

  const isTimeSlotAvailable = (table, date, time) => {
    const firstBookingTime = getFirstBookingTime(date);
  
    // Если у пользователя уже есть бронь на эту дату, проверяем, доступен ли слот на других столах
    if (firstBookingTime && table !== selectedTable) {
      const selectedTime = new Date(`${date}T${time}`);
      const firstBookingStart = new Date(`${date}T${firstBookingTime}`);
      const firstBookingEnd = new Date(firstBookingStart);
      firstBookingEnd.setHours(firstBookingStart.getHours() + 2); // Окно в 2 часа
  
      // Слот доступен, если он начинается в то же время или на час позже первой брони
      if (
        selectedTime < firstBookingStart ||
        selectedTime >= firstBookingEnd
      ) {
        return false; // Слот недоступен
      }
    }
  
    // Проверяем, есть ли в existingBookings бронирование, которое пересекается с выбранным слотом
    return !existingBookings.some((booking) => {
      const bookingStart = new Date(`${booking.date}T${booking.time}`);
      const bookingEnd = new Date(bookingStart);
      bookingEnd.setHours(bookingStart.getHours() + booking.hours);
  
      const selectedStart = new Date(`${date}T${time}`);
      const selectedEnd = new Date(selectedStart);
      selectedEnd.setHours(selectedStart.getHours() + 1); // Фиксируем 1 час для проверки доступности
  
      return (
        booking.table === table &&
        ((selectedStart >= bookingStart && selectedStart < bookingEnd) ||
          (selectedEnd > bookingStart && selectedEnd <= bookingEnd) ||
          (selectedStart <= bookingStart && selectedEnd >= bookingEnd))
      );
    });
  };

  const getAvailableHours = (table, date, time) => {
    const firstBookingTime = getFirstBookingTime(date);
  
    // Если это не тот же стол, что и первая бронь, и есть ограничение по времени
    if (firstBookingTime ) {
      const selectedTime = new Date(`${date}T${time}`);
      const firstBookingStart = new Date(`${date}T${firstBookingTime}`);
      const firstBookingEnd = new Date(firstBookingStart);
      firstBookingEnd.setHours(firstBookingStart.getHours() + 2); // Окно в 2 часа
      // Если выбранный слот — это второй слот в окне (например, 13:00 при первой брони на 12:00)
      if (selectedTime.getHours() === firstBookingStart.getHours() + 1) {
        return [1]; // Доступен только 1 час
      }
    }
  
    // Проверяем, свободен ли следующий слот (на 1 час вперёд)
    const nextSlot = new Date(`${date}T${time}`);
    nextSlot.setHours(nextSlot.getHours() + 1);
    const nextSlotTime = nextSlot.toTimeString().slice(0, 5); // Форматируем время в "HH:MM"
  
    // Если следующий слот занят или это последний слот (01:00), доступен только 1 час
    if (
      !isTimeSlotAvailable(table, date, nextSlotTime) ||
      time === '01:00'
    ) {
      return [1]; // Только 1 час
    }
  
    // Иначе доступны оба варианта
    return [1, 2];
  };

  const canUserBookMore = (date) => {
    // Считаем количество бронирований пользователя на выбранную дату
    const userBookingsOnDate = bookings.filter(
      (booking) => booking.date === date
    ).length;
  
    // Если бронирований меньше 2, пользователь может создать ещё одну
    return userBookingsOnDate < 2;
  };

  const isTableAvailableForUser = (table, date) => {
    // Получаем все бронирования пользователя на выбранную дату
    const userBookingsOnDate = bookings.filter(
      (booking) => booking.date === date
    );
  
    // Если у пользователя уже есть бронь на этот стол, стол недоступен
    return !userBookingsOnDate.some((booking) => booking.table === table);
  };

  useEffect(() => {
    if (selectedDate) {
      updateHintMessage(selectedDate);
    }
  }, [bookings, selectedDate]);

  const updateHintMessage = (date) => {
    const userBookingsOnDate = bookings.filter(
      (booking) => booking.date === date
    );
  
    if (userBookingsOnDate.length === 1) {
      const booking = userBookingsOnDate[0];
      setHintMessage(
        `У вас уже есть одно бронирование на ${new Date(booking.date).toLocaleDateString('ru-RU', {
          weekday: "short",
          day: 'numeric',
          month: 'long',
        })}. Второе бронирование возможно только на другой стол и в рамках времени первого бронирования.`
      );
    } else {
      setHintMessage(null);
    }
  };

  const getFirstBookingTime = (date) => {
    const userBookingsOnDate = bookings.filter((booking) => booking.date === date);
    if (userBookingsOnDate.length > 0) {
      return userBookingsOnDate[0].time; // Возвращаем время первой брони
    }
    return null; // Если бронирований нет, возвращаем null
  };

  const handleMainBookButtonClick = async (time) => {
    setBookingPopupOpen(true); // Открываем попап бронирования
    fetchUser()
    // Получаем первое бронирование пользователя на выбранную дату
    // Если у пользователя уже есть брони, пытаемся получить его данные
    if (bookings.length > 0) {
      const lastBooking = bookings[bookings.length - 1];
      const userData = await fetchUserData(lastBooking.phone);
  
      if (userData) {
        // Подставляем данные пользователя в форму
        setFormData({
          name: userData.name,
          phone: userData.phone,
          hours: 1, // Сбрасываем количество часов
        });
      } else {
        // Если пользователь не найден, оставляем форму пустой
        setFormData({
          name: '',
          phone: '',
          hours: 1,
        });
      }
    } else {
      // Если бронирований нет, оставляем форму пустой
      setFormData({
        name: '',
        phone: '',
        hours: 1,
      });
    }
  };

  // Имитация запроса на получение данных пользователя
  const fetchUserData = async (phone) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = users.find((user) => user.phone === phone);
        resolve(user || null); // Возвращаем пользователя или null, если не найден
      }, 500); // Имитируем задержку сети
    });
  };

  // Имитация запроса на сохранение пользователя
  const saveUserData = async (user) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setUsers((prevUsers) => {
          const existingUser = prevUsers.find((u) => u.phone === user.phone);
          if (!existingUser) {
            return [...prevUsers, user]; // Добавляем нового пользователя
          }
          return prevUsers; // Пользователь уже существует
        });
        resolve();
      }, 500); // Имитируем задержку сети
    });
  };

  // Имитация запроса на создание бронирования
  const saveBookingData = async (booking) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setBookings((prevBookings) => [...prevBookings, booking]);
        resolve(booking);
      }, 500); // Имитируем задержку сети
    });
  };

  const handleBook = async  () => {
    if (selectedTable && selectedDate && selectedTimeSlot && formData.name && formData.phone) {
      // Проверяем, может ли пользователь создать ещё одну бронь на выбранную дату
      if (!canUserBookMore(selectedDate)) {
        setNotification('Вы уже создали 2 брони на этот день.');
        setTimeout(() => setNotification(null), 3000);
        return;
      }
  
      // Проверяем, доступен ли выбранный стол для пользователя
      if (!isTableAvailableForUser(selectedTable, selectedDate)) {
        setNotification('Вы уже забронировали этот стол на этот день.');
        setTimeout(() => setNotification(null), 3000);
        return;
      }
  
      // Создаем новое бронированием
      const newBooking = {
        id: Date.now(),
        table: selectedTable,
        date: selectedDate,
        time: selectedTimeSlot,
        name: formData.name,
        phone: formData.phone,
        hours: parseInt(formData.hours, 10),
      };

      // Сохраняем бронирование
      try {
        // const bookingData = await saveBookingData(newBooking);
        // Обновляем состояние
        setBookings([...bookings, bookingData]);
        setExistingBookings([...existingBookings, bookingData]);
        setSelectedTimeSlot(null);
        setBookingPopupOpen(false);
        setFormData({ name: '', phone: '', hours: 1 });
        // onSendData()
        tg.sendData(JSON.stringify(newBooking));

        setNotification('Бронирование успешно создано!');
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        console.error('Ошибка при создании бронирования:', error);
        setNotification('Ошибка при создании бронирования.');
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  return (
    <div className="App">
      {/* Уведомление */}
      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}
      {/* Кнопки "Мои брони", Столы и даты*/}
      <div className="button-container">
        {/* <button className="booking-button" onClick={handleTestButtonClick}>
          test button
        </button> */}

        <button className="booking-button" onClick={handleBookingButtonClick}>
          Мои брони
        </button>

        {/* Подсказка */}
        {hintMessage && (
          <div className="hint-message">
            <i className="fas fa-info-circle"></i>
            <p>{hintMessage}</p>
          </div>
        )}

        <div className="table-buttons">
          {[3, 4, 5, 6].map((tableNumber) => {
            let isTableAvailable = isTableAvailableForUser(tableNumber, selectedDate);
            const isDateAvailable = canUserBookMore(selectedDate);
            isTableAvailable = isDateAvailable ? isTableAvailable : false ;
            return (
              <button
                key={tableNumber}
                className={`table-button ${selectedTable === tableNumber ? 'selected' : ''}`}
                onClick={() => handleTableSelect(tableNumber)}
                disabled={!isTableAvailable}
              >
                Стол {tableNumber}
                
              </button>
            );
          })}
        </div>

        <div className="date-buttons">
          {dates.map((date) => {
            const isDateAvailable = canUserBookMore(date);
            return (
            <div key={date} className="date-button-container">
              <button
                className={`date-button ${selectedDate === date ? 'selected' : ''}`}
                onClick={() => handleDateSelect(date)}
                disabled={!isDateAvailable}
              >
                {new Date(date).toLocaleDateString('ru-RU', {
                  weekday: "long",
                  day: 'numeric',
                  month: 'long',
                })}
                <span className="chevron">
                  {openDate === date ? <i className="fas fa-chevron-up"></i> : <i className="fas fa-chevron-down"></i>}
                </span>
              </button>
              {!isDateAvailable && (
                <p className="input-hint">Вы уже создали 2 брони на этот день.</p>
              )}
              {openDate === date && (
                <div className="time-slots">
                  {timeSlots.map((time) => {
                    let isAvailable = isTimeSlotAvailable(selectedTable, selectedDate, time);
                    const isAllAvailable = isTableAvailableForUser(selectedTable, selectedDate);
                    isAvailable = isAllAvailable ? isAvailable : isAllAvailable;

                    // Проверяем, доступен ли слот на других столах
                    const firstBookingTime = getFirstBookingTime(selectedDate);
                    if (firstBookingTime ) {
                      const selectedTime = new Date(`${selectedDate}T${time}`);
                      const firstBookingStart = new Date(`${selectedDate}T${firstBookingTime}`);
                      const firstBookingEnd = new Date(firstBookingStart);
                      firstBookingEnd.setHours(firstBookingStart.getHours() + 2);

                      if (
                        selectedTime < firstBookingStart ||
                        selectedTime >= firstBookingEnd
                      ) {
                        isAvailable = false;
                      }
                    }

                    return (
                      <button
                        key={time}
                        className={`time-slot-button ${selectedTimeSlot === time ? 'selected' : ''}`}
                        onClick={() => handleTimeSlotSelect(time)}
                        disabled={!isAvailable}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )})}
        </div>
      </div>

      {/* Плавающая кнопка "Забронировать" */}
      {selectedTimeSlot && (
        <div className="floating-book-button">
          <button className="book-button" onClick={handleMainBookButtonClick}>
            Забронировать
          </button>
        </div>
      )}

      {/* Попап "Мои брони" */}
      {isPopupOpen && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h2>Мои брони</h2>
              <button className="close-icon" onClick={handleBookingButtonClick}>
                &times;
              </button>
            </div>

            <div className="popup-body">
              {userBookings.length === 0 ? (
                <p className="no-bookings">У вас нет бронирований</p>
              ) : (
                <div className="bookings-list">
                  {userBookings.map((booking) => (
                    <div key={booking.id} className="booking-item">
                      <div className="booking-details">
                        <p><strong>Стол:</strong> {booking.table}</p>
                        <p><strong>Дата:</strong> {booking.date}</p>
                        <p><strong>Время:</strong> {booking.time}</p>
                        <p><strong>Имя:</strong> {booking.name}</p>
                        <p><strong>Часы:</strong> {booking.hours}</p>
                      </div>
                      <button
                        className="delete-button"
                        onClick={() => openDeletePopup(booking.id)}
                      >
                        <i className="fas fa-trash"></i> {/* Иконка мусорной корзины */}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="popup-footer">
              <button className="close-button" onClick={handleBookingButtonClick}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Попап подтверждения удаления */}
      {isDeletePopupOpen && (
        <div className="popup-overlay">
        <div className="popup-confirm-content">
          <div className="popup-header">
            <h2>Подтверждение</h2>
          </div>

          <div className="popup-body">
              <p className="no-bookings">Вы уверены, что хотите удалить это бронирование?</p>
          </div>

          <div className="popup-footer">
            <button className="cancel-button" onClick={closeDeletePopup}>Отмена</button>
            <button className="confirm-button" onClick={handleDeleteBooking}>Удалить</button>
          </div>
        </div>
      </div>
      )}

      {/* Попап c формой бронирования */}
      {isBookingPopupOpen && (
        <div className="popup-overlay">
          <div className="booking-popup-content">
            <div className="booking-popup-header">
              <h2>Бронирование</h2>
              <button className="close-icon" onClick={closeBookingPopup}>
                &times;
              </button>
            </div>

            <div className="booking-info">
              <p><strong>Стол:</strong> {selectedTable}</p>
              <p><strong>Дата:</strong> {selectedDate}</p>
              <p><strong>Время:</strong> {selectedTimeSlot}</p>
            </div>

            <form className="booking-form">
              <div className="form-group">
                <label htmlFor="name">Имя:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  pattern="[A-Za-zА-Яа-я\s]+"
                  title="Только буквы и пробелы"
                  maxLength={30} // Ограничение на 30 символов
                  required
                />
                 <p className="input-hint">только буквы и пробелы (максимум 30 символов)</p>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Телефон:</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  pattern="[0-9]+"
                  title="Только цифры"
                  maxLength={11} // Ограничение на 30 символов
                  required
                />
                <p className="input-hint">только цифры (максимум 11 символов)</p>
              </div>

              <div className="form-group">
                <label htmlFor="hours">Количество часов:</label>
                <select
                  id="hours"
                  name="hours"
                  value={formData.hours}
                  onChange={handleHoursChange}
                  required
                >
                  {getAvailableHours(selectedTable, selectedDate, selectedTimeSlot).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour} час{hour > 1 ? 'а' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </form>

            <div className="booking-popup-footer">
              <button className="close-button" onClick={closeBookingPopup}>
                Закрыть
              </button>
              <button
                className="confirm-button"
                onClick={handleBook}
                disabled={!formData.name || !formData.phone}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;