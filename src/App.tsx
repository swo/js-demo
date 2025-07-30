import { useState, useEffect } from "react";
import "./App.css";
import Papa from "papaparse";
import { LineChart } from "@mui/x-charts/LineChart";
import _ from "lodash";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BarChart } from "@mui/x-charts";
import stateHexData from "./data/state-hex.tsx";

function App() {
  const theme = createTheme({
    colorSchemes: {
      dark: true,
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <h1>Rt estimates</h1>
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;

async function fetchStateData(): Promise<any[]> {
  const url =
    "https://raw.githubusercontent.com/epiforecasts/covid-rt-estimates/refs/heads/master/subnational/united-states/cases/summary/rt.csv";

  try {
    // Fetch the CSV data
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();

    // Parse CSV using PapaParse
    const parseResult = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transform: (value, header) => {
        // transform "date" to Dates
        if (header === "date") {
          return new Date(value);
        }
        return value;
      },
      transformHeader: (header: string) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      console.warn("CSV parsing errors:", parseResult.errors);
    }

    return parseResult.data as any[];
  } catch (error) {
    console.error("Error fetching or parsing CSV data:", error);
    return [];
  }
}

type stateDataType = {
  temporal: {
    series: { dataKey: string }[];
    // dataset is like [{date: "2020-01-01", Alaska: 0.1, Alabama, 0.2, ...}, ...]
    dataset: any[];
  };
  summary: {
    series: { dataKey: string }[];
    dataset: { state: string; value: number }[];
  };
};

function cleanStateData(data: any[]): stateDataType {
  // Transform data from an array of row objects to a format suitable for
  // MUI charts using Lodash

  // Transform dates into ISO strings
  data.forEach((row) => {
    if (row.date instanceof Date) {
      row.date = row.date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
    }
  });

  // Get all dates
  const dates = _.uniq(data.map((x) => x.date));
  const states = _.uniq(data.map((x) => x.state));

  // Create a dataset like: [{date: 2020-01-01, Alaska: 0.1, Alabama, 0.2, ...}, ...]
  const temporalDataset = dates.map((date) => {
    const row: any = { date: new Date(date) };
    states.forEach((state) => {
      const value = _.get(_.find(data, { date, state }), "median", null);
      row[state] = value;
    });
    return row;
  });

  // Create a series object like: [{datakey: "Alaska"}, {datakey: "Alabama"}, ...]
  const temporalSeries = states.map((state) => ({
    dataKey: state,
    label: state,
    showMark: false,
  }));

  // Create a summary dataset like: [{state: "Alaska", value: 0.1}, {state: "Alabama", value: 0.2}, ...]
  const summaryDataset = states.map((state) => {
    const value = _.meanBy(
      data.filter((x) => x.state === state),
      (x) => x.median
    );
    return { state, value };
  });

  const summarySeries = [{ dataKey: "value" }];

  return {
    temporal: { dataset: temporalDataset, series: temporalSeries },
    summary: { dataset: summaryDataset, series: summarySeries },
  };
}

function Dashboard() {
  return (
    <>
      <StateHexMap data={stateHexData} />
      <Charts />
    </>
  );
}

function StateHexMap({ data }: { data: any[] }) {
  return (
    <svg
      width="400"
      height="400"
      viewBox="-0.1 -0.1 15 15"
      className="state-hex-map"
    >
      {data.map((state) => (
        <polygon
          key={state.abbreviation}
          points={state.points}
          // className="state-hex"
          fill="red"
          stroke="blue"
          strokeWidth={0.1}
          // title={state.State}
        />
      ))}
      {data.map((state) => (
        <text
          x={state.x0}
          y={state.y0}
          textAnchor="middle"
          alignmentBaseline="central"
          fontSize={0.75}
        >
          {state.id}
        </text>
      ))}
    </svg>
  );
}

function Charts() {
  const [stateData, setStateData] = useState<stateDataType | null>(null);

  useEffect(() => {
    const getStateData = async () => {
      const data = await fetchStateData();
      const cleanedData = cleanStateData(data);
      setStateData(cleanedData);
    };

    getStateData();
  }, []);

  if (!stateData) {
    return <div>Loading data...</div>;
  }

  return (
    <>
      <LineChart
        height={500}
        dataset={stateData.temporal.dataset}
        xAxis={[
          {
            dataKey: "date",
            scaleType: "time",
            valueFormatter: (v) => v.toLocaleDateString(),
          },
        ]}
        series={stateData.temporal.series}
        slotProps={{ tooltip: { trigger: "item" } }}
      />

      <BarChart
        height={800}
        layout="horizontal"
        dataset={stateData.summary.dataset}
        yAxis={[{ dataKey: "state" }]}
        series={stateData.summary.series}
        // slotProps={{ tooltip: { trigger: "item" } }}
      />
    </>
  );
}
