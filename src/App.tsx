import { useState, useEffect } from "react";
import "./App.css";
import Papa from "papaparse";
import { LineChart } from "@mui/x-charts/LineChart";

function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getData();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setData([]);
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
      <Charts data={data} />
    </>
  );
}

export default App;

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
      preview: 10000,
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

function Charts({ data }: { data: any[] }) {
  const pivotedData = pivot(data, "median");

  return (
    <div>
      <h2>Charts</h2>
      <LineChart
        dataset={pivotedData}
        xAxis={[
          {
            dataKey: "date",
            scaleType: "time",
            valueFormatter: (date) => date.toISOString().slice(0, 10),
          },
        ]}
        series={[
          { dataKey: "Alabama", label: "Alabama", showMark: false },
          { dataKey: "Colorado", label: "Colorado", showMark: false },
        ]}
      />
      {data.map((item, index) => (
        <div key={index}>
          <p>{JSON.stringify(item)}</p>
        </div>
      ))}
    </div>
  );
}

function pivot(data: object[], y_key: string): object[] {
  // The data start in a form like { state: "AL", date: "2024-01-01", y: 0}, ...
  // Transform to a form like { date: "2024-01-01", AL: 0, ... }

  const pivoted: { [key: string]: any } = {};

  data.forEach((item) => {
    const record = item as any;
    const dateKey = record.date;
    const stateKey = record.state;
    const yValue = record[y_key];

    // Initialize the date entry if it doesn't exist
    if (!pivoted[dateKey]) {
      pivoted[dateKey] = { date: dateKey };
    }

    // Add the state's y value to this date
    pivoted[dateKey][stateKey] = yValue;
  });

  // Convert object back to array
  return Object.values(pivoted);
}
