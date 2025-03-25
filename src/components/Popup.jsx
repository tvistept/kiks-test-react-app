import React from "react";

const Popup = ({ children, onClose }) => {
  return (
    <div className="popup-overlay">
      <div className="popup">
        <button className="popup-close" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default Popup;