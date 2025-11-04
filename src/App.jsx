import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import {useTelegram} from "./hooks/useTelegram";

function App() {
  const {tg} = useTelegram();
  tg.expand();
  const userChatId = new URLSearchParams(window.location.search).get('user_id');
  
  // Новое состояние для попапа выбора клуба
  const [isClubPopupOpen, setClubPopupOpen] = useState(true); // Открываем при старте
  const [selectedClub, setSelectedClub] = useState(null); // Состояние для выбранного клуба
  
  const [isPopupOpen, setPopupOpen] = useState(false); // Состояние для попапа "Мои брони"
  const [isDeletePopupOpen, setDeletePopupOpen] = useState(false); // Состояние для попапа подтверждения удаления
  const [bookingToDelete, setBookingToDelete] = useState(null); // Бронирование, которое пользователь хочет удалить
  const [bookings, setBookings] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [userData, setUserData] = useState({});
  const [selectedTable, setSelectedTable] = useState(4); // Состояние для выбранного стола
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

  // Функция для обработки выбора клуба
  const handleClubSelect = (clubAddress) => {
    setSelectedClub(clubAddress);
    setSelectedDate(null);
    setOpenDate(null);
    setSelectedTimeSlot(null);
    if (clubAddress == 'Марата 56-58') {
      setSelectedTable(3);
    } else if (clubAddress == 'Каменноостровский 26-28') {
      setSelectedTable(4);
    }
    setClubPopupOpen(false); // Закрываем попап выбора клуба
  };

  // Функция для открытия попапа смены клуба
  const handleChangeClub = () => {
    setClubPopupOpen(true);
  };

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
        chat_id: booking.chat_id,
        club_id: booking.club_id
      }));
      setBookings(dataToSet);
      setExistingBookings(dataToSet);
      setUserBookings(dataToSet.filter(booking => booking.chat_id == userChatId).sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (err) {
      setError(err.message);
      console.error('Ошибка при загрузке бронирований:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Функция для загрузки пользователя с сервера
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://kiks-app.ru:5000/api/get-user?chat_id=${userChatId}`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки пользователя');
      }
      const data = await response.json();
      const user = Array.isArray(data) ? data[0] : data;
      setUserData(user); // Сохраняем данные в состоянии
    } catch (err) {
      setError(err.message);
      console.error('Ошибка при загрузке пользователя:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBooking = async (bookingId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://kiks-app.ru:5000/api/bookings/${bookingId}?chat_id=${userChatId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error('Ошибка удаления бронирования');
      }
  
      // Обновляем локальное состояние после успешного удаления
      setBookings(bookings.filter(booking => booking.id !== bookingId));
      setExistingBookings(existingBookings.filter(booking => booking.id !== bookingId));
      setUserBookings(userBookings.filter(booking => booking.id !== bookingId));
  
      setNotification('Бронирование успешно удалено!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setError(err.message);
      setNotification('Ошибка при удалении бронирования');
      setTimeout(() => setNotification(null), 3000);
      console.error('Ошибка при удалении бронирования:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Загружаем бронирования при монтировании компонента
  useEffect(() => {
    // if (selectedClub === 'Марата 56') {
    //   setSelectedTable(3);
    // } else if (selectedClub === 'Каменноостровский 77') {
    //   setSelectedTable(3);
    // }

    fetchBookings();
    fetchUser();
  }, [fetchBookings, fetchUser]);

  // Функция для проверки, является ли день выходным (суббота или воскресенье)
  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 - воскресенье, 6 - суббота
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  // Функция для генерации дат на неделю вперёд
  const generateDates = (datesCnt) => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < datesCnt; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // Формат YYYY-MM-DD
    }
    return dates;
  };

  // Функция для генерации временных слотов с учетом выходных
  const generateTimeSlots = (date) => {
    const slots = [];
    const startHour = isWeekend(date) ? 12 : 14; // 12:00 в выходные, 14:00 в будни
    
    for (let hour = startHour; hour <= 25; hour++) {
      const time = hour % 24; // Преобразуем 24-часовой формат
      slots.push(`${time < 10 ? '0' : ''}${time}:00`);
    }
    return slots;
  };

  

  const dates = generateDates(10); // Генерируем даты
  const datesSecondKiks = generateDates(21); // Генерируем даты для КИКС2
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
    if (bookingToDelete) {
      await deleteBooking(bookingToDelete);
      closeDeletePopup(); // Закрываем попап после удаления
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

    // Определяем club_id для текущего выбранного клуба
    const currentClubId = selectedClub === 'Марата 56-58' ? 'kiks1' : 'kiks2';
  
    // Проверяем, есть ли в existingBookings бронирование, которое пересекается с выбранным слотом
    return !existingBookings.some((booking) => {
      if (booking.club_id !== currentClubId) {
        return false;
      }

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
    const currentClubId = selectedClub === 'Марата 56-58' ? 'kiks1' : 'kiks2';
    // Считаем количество бронирований пользователя на выбранную дату
    const userBookingsOnDate = bookings.filter(
    (booking) => 
      booking.date === date && 
      booking.chat_id == userChatId && 
      booking.club_id === currentClubId
  ).length;
  
    // Если бронирований меньше 2, пользователь может создать ещё одну
    return userBookingsOnDate < 2;
  };

  const isTableAvailableForUser = (table, date) => {
    // Определяем club_id для текущего выбранного клуба
    const currentClubId = selectedClub === 'Марата 56-58' ? 'kiks1' : 'kiks2';
    // Получаем все бронирования пользователя на выбранную дату
    const userBookingsOnDate = bookings.filter(
      (booking) => 
        booking.date === date && 
        booking.chat_id == userChatId &&
        booking.club_id === currentClubId
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
    // Определяем club_id для текущего выбранного клуба
    const currentClubId = selectedClub === 'Марата 56-58' ? 'kiks1' : 'kiks2';
    const userBookingsOnDate = bookings.filter(
      (booking) => 
        booking.date === date && 
        booking.chat_id == userChatId && 
        booking.club_id === currentClubId
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
    // Определяем club_id для текущего выбранного клуба
    const currentClubId = selectedClub === 'Марата 56-58' ? 'kiks1' : 'kiks2';
    const userBookingsOnDate = bookings.filter((booking) => 
      booking.date === date && 
      booking.chat_id == userChatId && 
      booking.club_id === currentClubId
    );

    if (userBookingsOnDate.length > 0) {
      return userBookingsOnDate[0].time; // Возвращаем время первой брони
    }
    return null; // Если бронирований нет, возвращаем null
  };

  const handleMainBookButtonClick = async (time) => {
    setBookingPopupOpen(true); // Открываем попап бронирования
    console.log(userChatId);
    console.log(userData);
    if (userData) {
      // Подставляем данные пользователя в форму
      setFormData({
        name: userData.firstName,
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
        club: selectedClub,
      };

      // Сохраняем бронирование
      try {
        // const bookingData = await saveBookingData(newBooking);
        // Обновляем состояние
        // setBookings([...bookings, newBooking]);
        // setExistingBookings([...existingBookings, newBooking]);
        // setSelectedTimeSlot(null);
        // setBookingPopupOpen(false);
        // setFormData({ name: '', phone: '', hours: 1 });
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
      {/* Попап выбора клуба */}
      {isClubPopupOpen && (
        <div className="popup-overlay">
          <div className="club-popup-content">
            <div className="popup-header">
              <h2>Где хочешь играть?</h2>
            </div>

            <div className="club-buttons-container">
              <button 
                className="club-button"
                // disabled = "disabled"
                onClick={() => handleClubSelect('Марата 56-58')}
              >
                Марата 56-58
              </button>
              <button 
                className="club-button"
                onClick={() => handleClubSelect('Каменноостровский 26-28')}
              >
                Каменноостровский 26-28
              </button>
            </div>
          </div>
        </div>
      )}

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
        {/* Блок с выбранным клубом и кнопкой смены */}
        {selectedClub && (
          <div className="club-info-container">
            <div className="selected-club-info">
              <span className="club-name">{selectedClub}</span>
              <button 
                className="change-club-button"
                onClick={handleChangeClub}
              >
                Сменить
              </button>
            </div>
          </div>
        )}

        {/* Блок со схемой зала */}
        <div className="hall-scheme">
          <h3>Схема зала</h3>
          
          {selectedClub === 'Марата 56-58' && (
            <div className="scheme-content">
              <div className="tables-grid">
                <div className="table-item booking-table">
                  <div className="table-number">Стол 1</div>
                  <div className="table-type">Живая очередь (пул)</div>
                </div>
                <div className="table-item booking-table">
                  <div className="table-number">Стол 2</div>
                  <div className="table-type">Живая очередь (пул)</div>
                </div>
                <div className="table-item booking-table">
                  <div className="table-number">Стол 3</div>
                  <div className="table-type">Пул</div>
                </div>
                <div className="table-item booking-table">
                  <div className="table-number">Стол 4</div>
                  <div className="table-type">Пул</div>
                </div>
                <div className="table-item booking-table">
                  <div className="table-number">Стол 5</div>
                  <div className="table-type">Пул</div>
                </div>
                <div className="table-item booking-table">
                  <div className="table-number">Стол 6</div>
                  <div className="table-type">Пул</div>
                </div>
              </div>
            </div>
          )}
          
          {selectedClub === 'Каменноостровский 26-28' && (
            <div className="scheme-content">
              <div className="tables-grid">
                <div className="table-item booking-table">
                  <div className="table-number">Стол 1</div>
                  <div className="table-type">Живая очередь (пул)</div>
                </div>
                <div className="table-item booking-table">
                  <div className="table-number">Стол 2</div>
                  <div className="table-type">Живая очередь (пул)</div>
                </div>

                <div className="table-item booking-table">
                  <div className="table-number">Стол 3</div>
                  <div className="table-type">Живая очередь (пул)</div>
                </div>

                <div className="table-item booking-table">
                  <div className="table-number">Стол 4</div>
                  <div className="table-type">Пул</div>
                </div>

                <div className="table-item pool-table">
                  <div className="table-number">Стол 5</div>
                  <div className="table-type">Пул</div>
                </div>

                <div className="table-item pool-table">
                  <div className="table-number">Стол 6</div>
                  <div className="table-type">Русский бильард</div>
                </div>

                <div className="table-item booking-table">
                  <div className="table-number">DARK ROOM</div>
                  <div className="table-type">VIP (пул)</div>
                </div>
                
                <div className="table-item booking-table">
                  <div className="table-number">WOOD ROOM</div>
                  <div className="table-type">VIP (пул)</div>
                </div>

                
              </div>
            </div>
          )}
        </div>

        {/* Блок с информацией и ссылкой на гугл-таблицу */}
        <div className="info-block">
          {selectedClub === 'Марата 56-58' && (
            <p>
              Салют!<br />
              Иди в <a 
                href="https://docs.google.com/spreadsheets/d/1xubZnVNe3ED2CmUwXWHvqtwcI62RzEbIJVKeIB8a0kM" 
                target="_blank" 
                rel="noopener noreferrer"
                className="google-sheet-link"
              >
                гугл-таблицу
              </a>, чтобы прикинуть кий к носу!<br />
              Есть подходящий слот — возвращайся сюда и бронируй нужный слот. Иначе можешь попытать удачу в живой очереди на месте.
            </p>
          )}

          {selectedClub === 'Каменноостровский 26-28' && (
            <p>
              Салют!<br />
              Иди в <a 
                href="https://docs.google.com/spreadsheets/d/1pSnfQUdNLlGPMecTYKUzBcImykpKTBARmOutdZ51YKo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="google-sheet-link"
              >
                гугл-таблицу
              </a>, чтобы прикинуть кий к носу!<br />
              Есть подходящий слот — возвращайся сюда и бронируй нужный слот. Иначе можешь попытать удачу в живой очереди на месте.
            </p>
          )}
          
        </div>

        {/* Кнопка мои брони*/}
        {/* <button className="booking-button" onClick={handleBookingButtonClick}>
          Мои брони
        </button> */}

        {/* Подсказка */}
        {hintMessage && (
          <div className="hint-message">
            <i className="fas fa-info-circle"></i>
            <p>{hintMessage}</p>
          </div>
        )}

        <div className="table-buttons">
          {(() => {
            // Определяем диапазон столов в зависимости от выбранного клуба
            let tablesRange = [];
            if (selectedClub === 'Марата 56-58') {
              tablesRange = [3, 4, 5, 6]; // Столы с 3 по 6
            } else if (selectedClub === 'Каменноостровский 26-28') {
              tablesRange = [4, 5, 6, 7, 8]; // Столы с 3 по 8
            }
            
            return tablesRange.map((tableNumber) => {
              let isTableAvailable = isTableAvailableForUser(tableNumber, selectedDate);
              const isDateAvailable = canUserBookMore(selectedDate);
              isTableAvailable = isDateAvailable ? isTableAvailable : false;
              let tableName
              if (selectedClub == 'Каменноостровский 26-28') {
                if (tableNumber == 7) {
                  tableName = 'DARK ROOM'
                } else if (tableNumber == 8) {
                  tableName = 'WOOD ROOM'
                } else  {
                  tableName = `Стол ${tableNumber}`
                }
              } else {
                tableName = `Стол ${tableNumber}`
              }

              return (
                <button
                  key={tableNumber}
                  className={`table-button ${selectedTable === tableNumber ? 'selected' : ''}`}
                  onClick={() => handleTableSelect(tableNumber)}
                  disabled={!isTableAvailable}
                >
                  {tableName}
                </button>
              );
            });
          })()}
        </div>

        <div className="date-buttons">
        {(() => {
          // Выбираем массив дат в зависимости от клуба
          const datesToShow = selectedClub === 'Марата 56-58' ? dates : datesSecondKiks;
          
          return datesToShow.map((date) => {
            const isDateAvailable = canUserBookMore(date);
            // Генерируем временные слоты для конкретной даты
            const timeSlotsForDate = generateTimeSlots(date);
            
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
                    {timeSlotsForDate.map((time) => {
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
            );
          });
        })()}
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