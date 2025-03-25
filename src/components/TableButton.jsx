import React from "react";

const TableButton = ({ table, selectedTable, onSelect }) => {
  return (
    <button
      className={table === selectedTable ? "active" : "inactive"}
      onClick={() => onSelect(table)}
    >
      Стол {table}
    </button>
  );
};

export default TableButton;