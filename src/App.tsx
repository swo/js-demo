import { useState, useEffect } from "react";
import "./App.css";
import Papa from "papaparse";
import { LineChart } from "@mui/x-charts/LineChart";
import _ from "lodash";

function App() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const topoData = getTopoData();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getData();
        setData(cleanData(result));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setData({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <>
      <h1>Rt estimates</h1>
      <Charts dataset={data.dataset} series={data.series} />
    </>
  );
}

export default App;

async function getTopoData(): Promise<any> {
  const response = await fetch(
    "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
  );
  const topoData = await response.json();
  return topoData;
}

async function getData(): Promise<any[]> {
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

function cleanData(data: any[]): { dataset: any[]; series: any[] } {
  console.log("Cleaning");
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
  // return <Typography>Dates: {JSON.stringify(states)}</Typography>;

  // Create a dataset like: [{date: "2020-01-01", Alaska: 0.1, Alabama, 0.2, ...}, ...]
  const dataset = dates.map((date) => {
    const row: any = { date: new Date(date) };
    states.forEach((state) => {
      const value = _.get(_.find(data, { date, state }), "median", null);
      row[state] = value;
    });
    return row;
  });

  // Create a series object like: [{datakey: "Alaska"}, {datakey: "Alabama"}, ...]
  const series = states.map((state) => ({
    dataKey: state,
    label: state,
    showMark: false,
  }));

  return { dataset, series };
}

function Charts({ dataset, series }: { dataset: any[]; series: any[] }) {
  return (
    <LineChart
      height={500}
      dataset={dataset}
      xAxis={[
        {
          dataKey: "date",
          scaleType: "time",
          valueFormatter: (v) => v.toLocaleDateString(),
        },
      ]}
      series={series}
      slotProps={{ tooltip: { trigger: "item" } }}
    />
  );
}
