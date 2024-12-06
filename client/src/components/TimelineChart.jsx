import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonGroup } from '@mui/material';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import dayjs from 'dayjs';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const userColors = {
  23: '#FFBF00',
  24: '#93C572',
  27: '#FF5733',
};

const TimelineChart = () => {
  const containerRef = useRef(null);
  const [timeline, setTimeline] = useState(null);
  const [view, setView] = useState('month');
  const [clickedButton, setClickedButton] = useState('month');
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [data, setData] = useState([]);

  const initialStartDate = dayjs('2022-10-01');
  const initialEndDate = dayjs('2022-10-31');

  // Fetch users
  useEffect(() => {
    fetch('/users.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch users.json');
        return res.json();
      })
      .then((data) => {
        setUsers(data.users);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Fetch data
  useEffect(() => {
    fetch('/data.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch data.json');
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Parsing Datas
  const parseData = () => {
    if (users.length === 0) return { items: [], groups: [] };

    const items = [];

    // Layers
    data.layers?.forEach((layer, index) => {
      layer.layers?.forEach((entry) => {
        const user = users.find((u) => u.id === entry.userId);
        if (entry.startDate && entry.endDate && user) {
          const color = userColors[entry.userId] || '#e6f7ff';
          items.push({
            id: `${entry.userId}-${entry.startDate}-${index}`,
            content: user ? user?.name : 'Unknown',
            start: entry.startDate,
            end: entry.endDate,
            group: `Layer ${index + 1}`,
            style: `background-color: ${color}; border-radius: 4px;`,
          });
        }
      });
    });

    // Override Layer
    data.overrideLayer?.forEach((entry) => {
      const user = users.find((u) => u.id === entry.userId);
      if (entry.startDate && entry.endDate && user) {
        const color = userColors[entry.userId] || '#FFBF00';
        items.push({
          id: `${entry.userId}-${entry.startDate}-override`,
          content: user ? user.name : 'Unknown',
          start: entry.startDate,
          end: entry.endDate,
          group: 'Override Layer',
          style: `background-color: ${color}; border-radius: 4px;`,
        });
      }
    });

    // Final Schedule
    data.finalSchedule?.forEach((entry) => {
      const user = users.find((u) => u.id === entry.userId);
      if (entry.startDate && entry.endDate && user) {
        const color = userColors[entry.userId] || '#ccffcc';
        items.push({
          id: `${entry.userId}-${entry.startDate}-final`,
          content: user ? user.name : 'Unknown',
          start: entry.startDate,
          end: entry.endDate,
          group: 'Final Schedule',
          style: `background-color: ${color}; border-radius: 4px;`,
        });
      }
    });

    // Layer groups
    const groups = [
      { id: 'Layers', content: 'Layers' },
      ...data.layers?.map((_, index) => ({
        id: `Layer ${index + 1}`,
        content: `Layer ${index + 1}`,
      })),
      { id: 'Override Layer', content: 'Override Layer' },
      { id: 'Final Schedule', content: 'Final Schedule' },
    ];

    return { items, groups };
  };

  useEffect(() => {
    if (containerRef.current && !timeline && users.length > 0) {
      const { items, groups } = parseData();

      const dataset = new DataSet(items);
      const groupSet = new DataSet(groups);

      const options = {
        start: initialStartDate.toDate(),
        end: initialEndDate.toDate(),
        editable: false,
        stack: false,
        groupOrder: (a, b) => {
          if (a.content === 'Layers') return -1;
          if (b.content === 'Layers') return 1;
          if (a.content === 'Final Schedule') return 1;
          if (b.content === 'Final Schedule') return -1;
          return a.content > b.content ? 1 : -1;
        },
        groupTemplate: (group) => `<b>${group.content}</b>`,
      };

      const timelineInstance = new Timeline(
        containerRef.current,
        dataset,
        groupSet,
        options
      );
      setTimeline(timelineInstance);
    }
  }, [users, data]);

  const handleToday = () => {
    if (timeline) {
      timeline.moveTo(new Date());
    }
  };

  // Next button
  const handleNext = () => {
    if (timeline) {
      const currentEndDate = timeline.getWindow().end;
      const nextStartDate = dayjs(currentEndDate).add(1, view).toDate();
      const nextEndDate = dayjs(currentEndDate)
        .add(1, view)
        .endOf(view)
        .toDate();
      timeline.setWindow(nextStartDate, nextEndDate);
      setClickedButton('next');
    }
  };

  // Previous button
  const handlePrevious = () => {
    if (timeline) {
      const currentStartDate = timeline.getWindow().start;
      const prevStartDate = dayjs(currentStartDate).subtract(1, view).toDate();
      const prevEndDate = dayjs(currentStartDate)
        .subtract(1, view)
        .endOf(view)
        .toDate();
      timeline.setWindow(prevStartDate, prevEndDate);
      setClickedButton('previous');
    }
  };

  // Change views
  const handleViewChange = (newView) => {
    setView(newView);

    if (clickedButton === 'today') {
      if (timeline) {
        const start = dayjs().startOf(newView).toDate();
        const end = dayjs().endOf(newView).toDate();
        timeline.setWindow(start, end);
      }
    } else {
      const start = initialStartDate.startOf(newView).toDate();
      const end = initialStartDate.endOf(newView).toDate();
      timeline.setWindow(start, end);
      setClickedButton(newView);
    }
  };

  if (loading) {
    return <div>Loading Charts...</div>;
  }

  return (
    <Box sx={{ p: 12, ml: 8, border: '12px solid #DEEFF5' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 12,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Button
            sx={{
              ml: 2,
              alignItems: 'center',
              backgroundColor:
                clickedButton === 'today' ? '#0076CE' : 'transparent',
              color: clickedButton === 'today' ? 'white' : '#1E90FF',
              border: '1px solid #1E90FF',
              '&:hover': {
                backgroundColor: '#0076CE',
                color: 'white',
                border: '1px solid #0076CE',
              },
            }}
            onClick={() => {
              handleToday();
              setClickedButton('today');
            }}
          >
            Today
          </Button>
          <Button
            sx={{
              backgroundColor:
                clickedButton === 'previous' ? '#0076CE' : 'transparent',
              color: clickedButton === 'previous' ? 'white' : '#1E90FF',
              border: '1px solid #1E90FF',
              '&:hover': { backgroundColor: '#0076CE', color: 'white' },
            }}
            onClick={handlePrevious}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            sx={{
              backgroundColor:
                clickedButton === 'next' ? '#0076CE' : 'transparent',
              color: clickedButton === 'next' ? 'white' : '#1E90FF',
              border: '1px solid #1E90FF',
              '&:hover': { backgroundColor: '#0076CE', color: 'white' },
            }}
            onClick={handleNext}
          >
            <ChevronRightIcon />
          </Button>
        </Box>
        <ButtonGroup>
          {['day', '2-day', 'week', '2-week', 'month'].map((viewOption) => (
            <Button
              key={viewOption}
              onClick={() => handleViewChange(viewOption)}
              sx={{
                backgroundColor:
                  clickedButton === viewOption ? '#0076CE' : 'transparent',
                color: clickedButton === viewOption ? 'white' : '#1E90FF',
                border: '1px solid #1E90FF',
                '&:hover': {
                  backgroundColor: '#0076CE',
                  color: 'white',
                },
              }}
            >
              {viewOption === 'day' && '1 Day'}
              {viewOption === '2-day' && '2 Days'}
              {viewOption === 'week' && '1 Week'}
              {viewOption === '2-week' && '2 Weeks'}
              {viewOption === 'month' && 'Month'}
            </Button>
          ))}
        </ButtonGroup>
      </Box>
      <Box
        ref={containerRef}
        sx={{
          height: 'auto',
          width: '1200px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          ml: '12px',
        }}
      />
    </Box>
  );
};

export default TimelineChart;
