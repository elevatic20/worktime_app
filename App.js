import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Appearance,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { format, isSameMonth, parse, addMonths, subMonths } from "date-fns";

export default function App() {
  const [userName, setUserName] = useState("");
  const [tempUserName, setTempUserName] = useState("");
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [records, setRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "MM-yyyy")
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const isDarkMode = Appearance.getColorScheme() === "dark";
  const backgroundColor = isDarkMode ? "#121212" : "#eaeaea";
  const textColor = isDarkMode ? "#f5f5f5" : "#222";
  const accentColor = isDarkMode ? "#90caf9" : "#1976d2";

  const getFileName = (month) => `${userName}_${month}.json`;

  const loadRecords = async (name) => {
    const month = format(new Date(), "MM-yyyy");
    const fileName = getFileName(month);
    const path = FileSystem.documentDirectory + fileName;
    const data = await FileSystem.readAsStringAsync(path).catch(() => "[]");
    const parsed = JSON.parse(data);
    parsed.sort((a, b) => new Date(a.date) - new Date(b.date));
    setRecords(parsed);
  };

  const saveRecord = async () => {
    const startDateTime = new Date(date);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes());
    const endDateTime = new Date(date);
    endDateTime.setHours(endTime.getHours(), endTime.getMinutes());

    if (endDateTime <= startDateTime) {
      Alert.alert(
        "Greška",
        "Vrijeme završetka mora biti kasnije od vremena početka."
      );
      return;
    }

    const duration = (endDateTime - startDateTime) / 1000 / 60 / 60;
    const newRecord = {
      day: format(date, "EEEE"),
      date: format(date, "yyyy-MM-dd"),
      startTime: format(startDateTime, "HH:mm"),
      endTime: format(endDateTime, "HH:mm"),
      duration: duration.toFixed(2),
    };

    const updatedRecords = [...records];
    if (editingIndex !== null) {
      updatedRecords[editingIndex] = newRecord;
      setEditingIndex(null);
    } else {
      updatedRecords.push(newRecord);
    }

    updatedRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    setRecords(updatedRecords);
    const fileName = getFileName(format(date, "MM-yyyy"));
    await FileSystem.writeAsStringAsync(
      FileSystem.documentDirectory + fileName,
      JSON.stringify(updatedRecords)
    );
  };

  const exportToExcel = async () => {
    const [monthStr, yearStr] = selectedMonth.split("-");
    const selectedDate = parse(
      `01-${monthStr}-${yearStr}`,
      "dd-MM-yyyy",
      new Date()
    );
    const filteredRecords = records
      .filter((r) => {
        const recDate = new Date(r.date);
        return (
          recDate.getMonth() === selectedDate.getMonth() &&
          recDate.getFullYear() === selectedDate.getFullYear()
        );
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const ws = XLSX.utils.json_to_sheet(filteredRecords);
    const totalHours = filteredRecords.reduce(
      (sum, rec) => sum + parseFloat(rec.duration),
      0
    );
    const summary = [["Ukupno sati", totalHours.toFixed(2)]];
    XLSX.utils.sheet_add_aoa(ws, summary, { origin: -1 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Radni sati");
    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const monthName = format(selectedDate, "MMMM");
    const fileName = `${userName}_${monthName}.xlsx`;
    const filePath = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(filePath, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(filePath);
  };

  const deleteRecord = async (index) => {
    const updatedRecords = records.filter((_, i) => i !== index);
    setRecords(updatedRecords);
    const fileName = getFileName(format(date, "MM-yyyy"));
    await FileSystem.writeAsStringAsync(
      FileSystem.documentDirectory + fileName,
      JSON.stringify(updatedRecords)
    );
  };

  const StyledButton = ({ onPress, title, color = accentColor }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: color,
        padding: 12,
        borderRadius: 12,
        alignItems: "center",
        marginVertical: 8,
      }}
    >
      <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    if (userName && !isInitialized) {
      loadRecords(userName);
      setIsInitialized(true);
    }
  }, [userName]);

  const currentDayName = format(new Date(), "EEEE");
  const currentMonthDate = parse(
    `01-${selectedMonth}`,
    "dd-MM-yyyy",
    new Date()
  );

  const displayedRecords = records.filter((r) => {
    const recDate = new Date(r.date);
    return (
      recDate.getMonth() === currentMonthDate.getMonth() &&
      recDate.getFullYear() === currentMonthDate.getFullYear()
    );
  });

  if (!userName) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor,
        }}
      >
        <View
          style={{
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f1f1f1",
            borderRadius: 20,
            padding: 30,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: accentColor,
              marginBottom: 10,
            }}
          >
            Unesi svoje ime
          </Text>
          <TextInput
            style={{
              backgroundColor: isDarkMode ? "#333" : "#fff",
              borderRadius: 10,
              padding: 12,
              width: 220,
              color: textColor,
              fontSize: 16,
            }}
            onChangeText={setTempUserName}
            value={tempUserName}
            placeholder="npr. Toni"
            placeholderTextColor="#888"
          />
          <StyledButton
            title="Kreni"
            onPress={async () => {
              if (tempUserName.length === 0) return;
              setIsLoading(true);
              setUserName(tempUserName);
              await loadRecords(tempUserName);
              setIsInitialized(true);
              setIsLoading(false);
            }}
          />
          {isLoading && (
            <ActivityIndicator
              size="large"
              color={accentColor}
              style={{ marginTop: 20 }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor }}>
      <Text
        style={{
          fontSize: 30,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 10,
          color: accentColor,
        }}
      >
        {currentDayName}
      </Text>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          color: textColor,
          textAlign: "center",
          marginBottom: 5,
        }}
      >
        Odaberi mjesec
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <TouchableOpacity
          onPress={() =>
            setSelectedMonth(format(subMonths(currentMonthDate, 1), "MM-yyyy"))
          }
        >
          <Text style={{ fontSize: 24, color: accentColor }}>{"◀"}</Text>
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            marginHorizontal: 20,
            color: textColor,
          }}
        >
          {format(currentMonthDate, "LLLL yyyy")}
        </Text>
        <TouchableOpacity
          onPress={() =>
            setSelectedMonth(format(addMonths(currentMonthDate, 1), "MM-yyyy"))
          }
        >
          <Text style={{ fontSize: 24, color: accentColor }}>{"▶"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={{
          marginVertical: 10,
          backgroundColor: isDarkMode ? "#2c2c2c" : "#fff",
          padding: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ fontSize: 18, color: textColor }}>
          Datum: {format(date, "dd.MM.yyyy")}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(e, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      <TouchableOpacity
        onPress={() => setShowStartPicker(true)}
        style={{
          marginVertical: 10,
          backgroundColor: isDarkMode ? "#2c2c2c" : "#fff",
          padding: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ fontSize: 18, color: textColor }}>
          Početak: {format(startTime, "HH:mm")}
        </Text>
      </TouchableOpacity>
      {showStartPicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(e, date) => {
            setShowStartPicker(false);
            if (date) setStartTime(date);
          }}
        />
      )}

      <TouchableOpacity
        onPress={() => setShowEndPicker(true)}
        style={{
          marginVertical: 10,
          backgroundColor: isDarkMode ? "#2c2c2c" : "#fff",
          padding: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ fontSize: 18, color: textColor }}>
          Kraj: {format(endTime, "HH:mm")}
        </Text>
      </TouchableOpacity>
      {showEndPicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(e, date) => {
            setShowEndPicker(false);
            if (date) setEndTime(date);
          }}
        />
      )}

      <StyledButton
        title={editingIndex !== null ? "Ažuriraj" : "Spremi"}
        onPress={saveRecord}
      />
      <StyledButton
        title="Skini Excele"
        onPress={exportToExcel}
        color="#27ae60"
      />

      <FlatList
        data={displayedRecords}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View
            style={{
              padding: 10,
              backgroundColor: isDarkMode ? "#333" : "#fff",
              marginBottom: 5,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: textColor }}>
              {item.day} - {item.date}
            </Text>
            <Text style={{ color: textColor }}>
              {item.startTime} - {item.endTime} ({item.duration} sati)
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 5,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setDate(new Date(item.date));
                  const [sh, sm] = item.startTime.split(":");
                  const [eh, em] = item.endTime.split(":");
                  const newStart = new Date(date);
                  const newEnd = new Date(date);
                  newStart.setHours(+sh, +sm);
                  newEnd.setHours(+eh, +em);
                  setStartTime(newStart);
                  setEndTime(newEnd);
                  setEditingIndex(index);
                }}
              >
                <Text style={{ color: "#f1c40f" }}>Uredi</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteRecord(index)}>
                <Text style={{ color: "#e74c3c" }}>Obriši</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={() => {
          const total = displayedRecords.reduce(
            (sum, rec) => sum + parseFloat(rec.duration),
            0
          );
          return (
            <Text
              style={{
                marginTop: 10,
                fontSize: 20,
                fontWeight: "bold",
                color: accentColor,
              }}
            >
              UKUPNO: {total.toFixed(2)} h
            </Text>
          );
        }}
      />
    </View>
  );
}
