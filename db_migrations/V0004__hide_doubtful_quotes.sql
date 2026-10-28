UPDATE book_quotes SET published = FALSE WHERE
  quote LIKE 'Лучшие трейдеры не испытывают страха%'
  OR quote LIKE 'Богатые не работают ради денег%'
  OR quote LIKE 'Золото охотно приходит%'
  OR quote LIKE 'Финансовый гений существует%'
  OR quote LIKE 'Всегда ограничивайте убыток%'
  OR quote LIKE 'Рынок существует, чтобы служить вам%'
  OR quote LIKE 'Есть время покупать, есть время продавать%'
  OR quote LIKE 'Переверните задачу%'
  OR quote LIKE 'Знайте, чем вы владеете%'
  OR quote LIKE 'Важно не то, правы вы или нет%'
  OR quote LIKE 'Выигрывает или проигрывает%';