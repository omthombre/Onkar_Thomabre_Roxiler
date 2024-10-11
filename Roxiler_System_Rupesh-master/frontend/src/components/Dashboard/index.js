import React, { useState, useEffect, useCallback } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { TailSpin } from "react-loader-spinner";
import { AiOutlineAlignRight } from "react-icons/ai";
import { MdOutlineSmsFailed } from "react-icons/md";

import TransactionsStatistics from "../TransactionsStatistics";
import "./index.css";
import { StatsChart } from "../StatsChart";
import CategoryChart from "../CategoryChart";

const monthsData = [
  { monthNo: 1, monthName: "January" },
  { monthNo: 2, monthName: "February" },
  { monthNo: 3, monthName: "March" },
  { monthNo: 4, monthName: "April" },
  { monthNo: 5, monthName: "May" },
  { monthNo: 6, monthName: "June" },
  { monthNo: 7, monthName: "July" },
  { monthNo: 8, monthName: "August" },
  { monthNo: 9, monthName: "September" },
  { monthNo: 10, monthName: "October" },
  { monthNo: 11, monthName: "November" },
  { monthNo: 12, monthName: "December" },
];

const apiStatusConstant = {
  initial: "INITIAL",
  success: "SUCCESS",
  failure: "FAILURE",
  inprogress: "IN_PROGRESS",
};

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(monthsData[2].monthNo);
  const [searchText, setSearchText] = useState("");
  const [pageNo, setPageNo] = useState(1);
  const [transactionsData, setTransactionsData] = useState([]);
  const [apiStatus, setApiStatus] = useState(apiStatusConstant.initial);
  const [statistics, setStatistics] = useState({});
  const [itemPriceRange, setItemPriceRange] = useState([]);
  const [categories, setCategories] = useState({});
  const [apiStatusStatistics, setApiStatusStatistics] = useState(apiStatusConstant.initial);
  const itemsPerPage = 10; 

  const getTransactionData = useCallback(async () => {
    try {
      setApiStatus(apiStatusConstant.inprogress);
      const response = await fetch(
        `https://backendof.onrender.com/sales?month=${selectedMonth}&search_q=${searchText}&page=${pageNo}&limit=${itemsPerPage}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.length === 0) {
        console.log("No data available for this page");
      } else {
        setTransactionsData(data);
        console.log("Fetched data for page:", pageNo, data);
      }
      setApiStatus(apiStatusConstant.success);
    } catch (error) {
      setApiStatus(apiStatusConstant.failure);
      console.log("Error fetching transactions:", error.message);
    }
  }, [selectedMonth, searchText, pageNo, itemsPerPage]);

  const getStatisticsData = useCallback(async () => {
    try {
      setApiStatusStatistics(apiStatusConstant.inprogress);
      const response = await fetch(
        `https://backendof.onrender.com/all-statistics?month=${selectedMonth}`
      );
      const data = await response.json();
      console.log(data);
      setStatistics(data.statistics);
      setItemPriceRange(data.itemPriceRange);
      setCategories(data.categories);
      setApiStatusStatistics(apiStatusConstant.success);
    } catch (error) {
      setApiStatusStatistics(apiStatusConstant.failure);
      console.log(error.message);
    }
  }, [selectedMonth]);

  useEffect(() => {
    getTransactionData();
  }, [getTransactionData, pageNo]);

  useEffect(() => {
    getStatisticsData();
  }, [getStatisticsData, selectedMonth]);

  const next = () => {
    setPageNo((prevPageNo) => prevPageNo + 1);
  };

  const prev = () => {
    if (pageNo > 1) {
      setPageNo((prevPageNo) => prevPageNo - 1);
    }
  };

  const changeMonth = (event) => {
    setSelectedMonth(event.target.value);
    setPageNo(1); // Reset page number to 1 when month changes
  };

  const updateSearch = (event) => {
    setSearchText(event.target.value);
    setPageNo(1); // Reset page number to 1 when search text changes
  };

  const getTransactionTable = () => {
    if (transactionsData.length === 0)
      return (
        <div className="empty-view">
          <AiOutlineAlignRight size={50} />
          <h2>No Transactions Found</h2>
        </div>
      );
    return (
      <table border={1} className="transaction-table">
        <thead>
          <tr>
            <th>id</th>
            <th>title</th>
            <th>description</th>
            <th>price</th>
            <th>category</th>
            <th>sold</th>
            <th>image</th>
          </tr>
        </thead>
        <tbody>
          {transactionsData.map((each) => (
            <tr key={each.id}>
              <td className="center">{each.id}</td>
              <td>{each.title}</td>
              <td>{each.description}</td>
              <td className="center">{each.price} Rs</td>
              <td className="center">{each.category}</td>
              <td className="sold-status">
                {each.sold ? "✅" : undefined}
              </td>
              <td className="center">
                <img
                  src={each.image}
                  height={40}
                  width={40}
                  alt={each.title}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const loadingView = () => (
    <div className="loading-view">
      <TailSpin
        height="50"
        width="50"
        color="#4fa94d"
        ariaLabel="tail-spin-loading"
        radius="1"
        visible={true}
      />
    </div>
  );

  const failureView = (func) => (
    <div className="failure-view">
      <MdOutlineSmsFailed size={40} />
      <h2>Oops! Something Went Wrong</h2>
      <button className="retry-button" type="button" onClick={func}>
        Try again
      </button>
    </div>
  );

  const getStatisticsSuccessView = () => {
    const name = monthsData.find((each) => String(each.monthNo) === String(selectedMonth)).monthName;

    return (
      <div>
        <TransactionsStatistics
          monthNo={selectedMonth}
          monthName={name}
          statistics={statistics}
        />
        <StatsChart monthName={name} itemPriceRange={itemPriceRange} />
        <CategoryChart monthName={name} categories={categories} />
      </div>
    );
  };

  const getStatisticsView = () => {
    switch (apiStatusStatistics) {
      case apiStatusConstant.inprogress:
        return loadingView();
      case apiStatusConstant.success:
        return getStatisticsSuccessView();
      case apiStatusConstant.failure:
        return failureView(getStatisticsData);
      default:
        return null;
    }
  };

  const getTransactionView = () => {
    switch (apiStatus) {
      case apiStatusConstant.inprogress:
        return loadingView();
      case apiStatusConstant.success:
        return getTransactionTable();
      case apiStatusConstant.failure:
        return failureView(getTransactionData);
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Transaction Dashboard</h1>
      </header>
      <main className="dashboard-main">
        <section className="input-section">
          <div className="input-container">
            <IoSearchOutline size={20} />
            <input
              type="search"
              placeholder="Search Transactions"
              className="search-input"
              onChange={updateSearch}
            />
          </div>
          <div className="input-container">
            <select
              className="search-input"
              onChange={changeMonth}
              value={selectedMonth}
            >
              {monthsData.map((each) => (
                <option key={each.monthNo} value={each.monthNo}>
                  {each.monthName}
                </option>
              ))}
            </select>
          </div>
        </section>
        <section className="transactions-section">
          {getTransactionView()}
        </section>

        <section className="pagination-container">
          <p>Page No : {pageNo}</p>
          <div className="pagination-buttons">
            <button type="button" onClick={prev} disabled={pageNo === 1}>
              Prev
            </button>
            &nbsp;-&nbsp;
            <button type="button" onClick={next}>
              Next
            </button>
          </div>
          <p>Per Page : {itemsPerPage}</p>
        </section>
        {getStatisticsView()}
      </main>
    </div>
  );
};

export default Dashboard;
