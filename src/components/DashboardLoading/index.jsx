import React, { useState, useEffect } from "react";
import { Container, Content } from "rsuite";

import { Placeholder, Grid, Row, Col, Panel } from "rsuite";

const StatSkeleton = () => (
  <Grid fluid>
    <Row gutter={16}>
      {[1, 2, 3, 4].map((item) => (
        <Col xs={24} sm={12} md={6} key={item}>
          <Panel bordered style={{ marginBottom: 20 }}>
            {/* Sarlavha uchun kichik chiziq */}
            <Placeholder.Paragraph rows={1} style={{ width: "40%" }} active />
            <div style={{ marginTop: 20 }}>
              {/* Katta raqam (statistika) uchun qalin chiziq */}
              <Placeholder.Graph active height={30} style={{ width: "80%" }} />
            </div>
            <div style={{ marginTop: 15 }}>
              {/* Pastki qismdagi o'zgarish foizi uchun */}
              <Placeholder.Paragraph rows={1} style={{ width: "30%" }} active />
            </div>
          </Panel>
        </Col>
      ))}
    </Row>
  </Grid>
);
const ChartSkeleton = () => (
  <Panel
    bordered
    header={<Placeholder.Paragraph rows={1} style={{ width: "20%" }} active />}
  >
    {/* Grafik shaklini eslatuvchi blok */}
    <Placeholder.Graph active height={300} />

    <div style={{ marginTop: 20 }}>
      {/* Grafik ostidagi tushuntirishlar (legend) uchun */}
      <Row>
        <Col md={6}>
          <Placeholder.Paragraph rows={1} active />
        </Col>
        <Col md={6}>
          <Placeholder.Paragraph rows={1} active />
        </Col>
      </Row>
    </div>
  </Panel>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  return (
    <Content style={{ padding: "20px" }}>
      {loading ? (
        <>
          {/* Yuqori qism: Kartalar */}
          <StatSkeleton />

          {/* O'rta qism: Grafiklar */}
          <Grid fluid>
            <Row gutter={16}>
              <Col md={16}>
                <ChartSkeleton />
              </Col>
              <Col md={8}>
                <ChartSkeleton />
              </Col>
            </Row>
          </Grid>
        </>
      ) : (
        <div className="actual-content">
          {/* Bu yerda haqiqiy ma'lumotlar bo'ladi */}
          <h1>Dashboard Ma'lumotlari</h1>
        </div>
      )}
    </Content>
  );
}
